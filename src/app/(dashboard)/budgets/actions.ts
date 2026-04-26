"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { firstZodMessage } from "@/lib/zod-utils";
import type { Database } from "@/types/database";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-01$/, "Luna trebuie să fie prima zi (YYYY-MM-01)");

export const upsertBudgetSchema = z.object({
  category_id: z.string().uuid(),
  month: dateString,
  amount: z.number().int(),
  rollover: z.boolean(),
});

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type Ctx =
  | { ok: false; error: string }
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      user: { id: string };
      householdId: string;
    };

async function ctx(): Promise<Ctx> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) {
    return { ok: false, error: "Niciun household activ" };
  }
  return {
    ok: true,
    supabase,
    user,
    householdId: profile.active_household,
  };
}

export async function upsertBudget(
  input: UpsertBudgetInput,
): Promise<ActionResult> {
  const parsed = upsertBudgetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  type Insert = Database["public"]["Tables"]["budgets"]["Insert"];
  const row: Insert = {
    household_id: c.householdId,
    category_id: parsed.data.category_id,
    month: parsed.data.month,
    amount: parsed.data.amount,
    rollover: parsed.data.rollover,
  };

  const { error } = await c.supabase
    .from("budgets")
    .upsert(row, { onConflict: "household_id,category_id,month" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/budgets");
  return { ok: true, data: undefined };
}

export async function deleteBudget(
  category_id: string,
  month: string,
): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  const { error } = await c.supabase
    .from("budgets")
    .delete()
    .eq("category_id", category_id)
    .eq("month", month);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/budgets");
  return { ok: true, data: undefined };
}

export async function copyPreviousMonth(
  targetMonth: string,
): Promise<ActionResult<{ count: number }>> {
  if (!/^\d{4}-\d{2}-01$/.test(targetMonth)) {
    return { ok: false, error: "Lună invalidă" };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  const target = new Date(targetMonth + "T00:00:00");
  target.setMonth(target.getMonth() - 1);
  const prevMonth = target.toISOString().slice(0, 10);

  const { data: prev, error: fetchError } = await c.supabase
    .from("budgets")
    .select("category_id, amount, rollover")
    .eq("household_id", c.householdId)
    .eq("month", prevMonth);
  if (fetchError) return { ok: false, error: fetchError.message };
  if (!prev || prev.length === 0) {
    return { ok: false, error: "Nu există bugete pentru luna anterioară" };
  }

  type Insert = Database["public"]["Tables"]["budgets"]["Insert"];
  const rows: Insert[] = prev.map((b) => ({
    household_id: c.householdId,
    category_id: b.category_id ?? null,
    month: targetMonth,
    amount: b.amount,
    rollover: b.rollover,
  }));

  const { error: insertError } = await c.supabase
    .from("budgets")
    .upsert(rows, { onConflict: "household_id,category_id,month" });
  if (insertError) return { ok: false, error: insertError.message };

  revalidatePath("/budgets");
  return { ok: true, data: { count: rows.length } };
}

export const moveMoneySchema = z.object({
  from_category_id: z.string().uuid(),
  to_category_id: z.string().uuid(),
  amount: z.number().int().positive(),
  month: dateString,
});

export type MoveMoneyInput = z.infer<typeof moveMoneySchema>;

export async function moveMoney(
  input: MoveMoneyInput,
): Promise<ActionResult> {
  const parsed = moveMoneySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }
  if (parsed.data.from_category_id === parsed.data.to_category_id) {
    return { ok: false, error: "Sursa și destinația trebuie să difere" };
  }

  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  // Citim ambele bugete.
  const { data: rows, error: fetchError } = await c.supabase
    .from("budgets")
    .select("id, category_id, amount, rollover")
    .eq("household_id", c.householdId)
    .eq("month", parsed.data.month)
    .in("category_id", [parsed.data.from_category_id, parsed.data.to_category_id]);
  if (fetchError) return { ok: false, error: fetchError.message };

  const fromBudget = rows?.find((r) => r.category_id === parsed.data.from_category_id);
  const toBudget = rows?.find((r) => r.category_id === parsed.data.to_category_id);

  if (!fromBudget) {
    return { ok: false, error: "Categoria sursă nu are buget setat" };
  }
  if (fromBudget.amount < parsed.data.amount) {
    return { ok: false, error: "Sumă insuficientă în categoria sursă" };
  }

  // Update from.
  const { error: updFromError } = await c.supabase
    .from("budgets")
    .update({ amount: fromBudget.amount - parsed.data.amount })
    .eq("id", fromBudget.id);
  if (updFromError) return { ok: false, error: updFromError.message };

  // Insert/update to.
  if (toBudget) {
    const { error: updToError } = await c.supabase
      .from("budgets")
      .update({ amount: toBudget.amount + parsed.data.amount })
      .eq("id", toBudget.id);
    if (updToError) return { ok: false, error: updToError.message };
  } else {
    const { error: insertError } = await c.supabase.from("budgets").insert({
      household_id: c.householdId,
      category_id: parsed.data.to_category_id,
      month: parsed.data.month,
      amount: parsed.data.amount,
      rollover: false,
    });
    if (insertError) return { ok: false, error: insertError.message };
  }

  revalidatePath("/budgets");
  return { ok: true, data: undefined };
}

const allocationSchema = z.object({
  category_id: z.string().uuid(),
  amount: z.number().int().nonnegative(),
});

export const setReadyToAssignSchema = z.object({
  month: dateString,
  allocations: z.array(allocationSchema).max(100),
});

export type SetReadyToAssignInput = z.infer<typeof setReadyToAssignSchema>;

/**
 * Bulk-assign sume pe categorii pentru luna dată. Înlocuiește amount-ul
 * (NU adună). Categoriile fără rând în `allocations` rămân neatinse.
 */
export async function setReadyToAssign(
  input: SetReadyToAssignInput,
): Promise<ActionResult<{ count: number }>> {
  const parsed = setReadyToAssignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  type Insert = Database["public"]["Tables"]["budgets"]["Insert"];
  const rows: Insert[] = parsed.data.allocations.map((a) => ({
    household_id: c.householdId,
    category_id: a.category_id,
    month: parsed.data.month,
    amount: a.amount,
    rollover: false,
  }));

  const { error } = await c.supabase
    .from("budgets")
    .upsert(rows, { onConflict: "household_id,category_id,month" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/budgets");
  return { ok: true, data: { count: rows.length } };
}
