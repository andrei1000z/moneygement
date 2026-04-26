"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { simulatePayoff, type Debt, type Strategy } from "@/lib/debt";
import { createClient } from "@/lib/supabase/server";
import { firstZodMessage } from "@/lib/zod-utils";
import type { Database } from "@/types/database";

const BUCKET_TYPES = [
  "standard",
  "goal",
  "monthly",
  "goal_monthly",
  "debt",
] as const;

export const goalInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  target_amount: z.number().int().positive(),
  current_amount: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).default("RON"),
  target_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  account_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  bucket_type: z.enum(BUCKET_TYPES).default("goal"),
  /** Pentru debt — câmpuri stocate ca tags / metadata.
   * Pentru Phase 5 le păstrăm pe goal: target_amount = balance,
   * apr și min payment via notes într-un fișier separat. */
});

export type GoalInput = z.infer<typeof goalInputSchema>;

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

export async function createGoal(
  input: GoalInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = goalInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  type Insert = Database["public"]["Tables"]["goals"]["Insert"];
  const row: Insert = {
    household_id: c.householdId,
    name: parsed.data.name,
    target_amount: parsed.data.target_amount,
    current_amount: parsed.data.current_amount ?? 0,
    currency: parsed.data.currency,
    target_date: parsed.data.target_date ?? null,
    account_id: parsed.data.account_id ?? null,
    category_id: parsed.data.category_id ?? null,
    bucket_type: parsed.data.bucket_type,
  };

  const { data, error } = await c.supabase
    .from("goals")
    .insert(row)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/goals");
  return { ok: true, data: { id: data.id } };
}

export async function updateGoal(
  id: string,
  input: GoalInput,
): Promise<ActionResult> {
  const parsed = goalInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  type Update = Database["public"]["Tables"]["goals"]["Update"];
  const patch: Update = {
    name: parsed.data.name,
    target_amount: parsed.data.target_amount,
    currency: parsed.data.currency,
    target_date: parsed.data.target_date ?? null,
    account_id: parsed.data.account_id ?? null,
    category_id: parsed.data.category_id ?? null,
    bucket_type: parsed.data.bucket_type,
  };
  if (parsed.data.current_amount !== undefined) {
    patch.current_amount = parsed.data.current_amount;
  }

  const { error } = await c.supabase
    .from("goals")
    .update(patch)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/goals");
  return { ok: true, data: undefined };
}

export async function addToGoal(
  id: string,
  amount: number,
): Promise<ActionResult<{ current: number; reached: boolean }>> {
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount === 0) {
    return { ok: false, error: "Sumă invalidă" };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  const { data: goal, error: fetchError } = await c.supabase
    .from("goals")
    .select("current_amount, target_amount")
    .eq("id", id)
    .single();
  if (fetchError || !goal) {
    return { ok: false, error: fetchError?.message ?? "Goal inexistent" };
  }

  const next = Math.max(0, goal.current_amount + amount);
  const { error } = await c.supabase
    .from("goals")
    .update({ current_amount: next })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  const reached = next >= goal.target_amount && goal.current_amount < goal.target_amount;

  revalidatePath("/goals");
  return { ok: true, data: { current: next, reached } };
}

export async function completeGoal(id: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  const { error } = await c.supabase
    .from("goals")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/goals");
  return { ok: true, data: undefined };
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  const { error } = await c.supabase.from("goals").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/goals");
  return { ok: true, data: undefined };
}

// ---------- Debt payoff plan (server wrapper peste /lib/debt.ts) ---------
const debtSchema = z.object({
  id: z.string(),
  name: z.string(),
  balanceMinor: z.number().int().nonnegative(),
  apr: z.number().min(0).max(2),
  minPaymentMinor: z.number().int().nonnegative(),
});

export const payoffInputSchema = z.object({
  debts: z.array(debtSchema).min(1).max(20),
  strategy: z.enum(["snowball", "avalanche"]),
  extraMonthlyMinor: z.number().int().nonnegative(),
});

export type PayoffInput = z.infer<typeof payoffInputSchema>;

export async function calculatePayoffPlan(input: PayoffInput) {
  const parsed = payoffInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: firstZodMessage(parsed.error) };
  }
  const plan = simulatePayoff(
    parsed.data.debts as Debt[],
    parsed.data.strategy as Strategy,
    parsed.data.extraMonthlyMinor,
  );
  return { ok: true as const, data: plan };
}
