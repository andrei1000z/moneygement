"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { firstZodMessage } from "@/lib/zod-utils";
import type { Database } from "@/types/database";

export const presetInputSchema = z.object({
  label: z.string().trim().min(1).max(40),
  emoji: z.string().trim().max(8).optional().nullable(),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  account_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
});

export type PresetInput = z.infer<typeof presetInputSchema>;
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

export async function createPreset(
  input: PresetInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = presetInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  type Insert = Database["public"]["Tables"]["quick_add_presets"]["Insert"];
  const { data, error } = await c.supabase
    .from("quick_add_presets")
    .insert({
      household_id: c.householdId,
      user_id: c.user.id,
      label: parsed.data.label,
      emoji: parsed.data.emoji ?? null,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      account_id: parsed.data.account_id ?? null,
      category_id: parsed.data.category_id ?? null,
    } satisfies Insert)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/transactions");
  return { ok: true, data: { id: data.id } };
}

export async function updatePreset(
  id: string,
  input: PresetInput,
): Promise<ActionResult> {
  const parsed = presetInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  const { error } = await c.supabase
    .from("quick_add_presets")
    .update({
      label: parsed.data.label,
      emoji: parsed.data.emoji ?? null,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      account_id: parsed.data.account_id ?? null,
      category_id: parsed.data.category_id ?? null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/transactions");
  return { ok: true, data: undefined };
}

export async function deletePreset(id: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  const { error } = await c.supabase
    .from("quick_add_presets")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/transactions");
  return { ok: true, data: undefined };
}
