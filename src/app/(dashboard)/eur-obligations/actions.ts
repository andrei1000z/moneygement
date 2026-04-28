"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { firstZodMessage } from "@/lib/zod-utils";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const obligationSchema = z.object({
  label: z.string().trim().min(1, "Eticheta e obligatorie").max(100),
  amount_eur: z
    .number()
    .int("Suma trebuie să fie în cenți")
    .positive("Suma trebuie pozitivă"),
  day_of_month: z.number().int().min(1).max(31),
  account_id: z.string().uuid().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
  notes: z.string().max(500).optional().nullable(),
});

export type ObligationInput = z.infer<typeof obligationSchema>;

async function withProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Neautentificat" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) {
    return { ok: false as const, error: "Niciun household activ" };
  }
  return { ok: true as const, supabase, householdId: profile.active_household };
}

export async function addObligation(
  input: ObligationInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = obligationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }
  const ctx = await withProfile();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("eur_obligations")
    .insert({
      household_id: ctx.householdId,
      label: parsed.data.label,
      amount_eur: parsed.data.amount_eur,
      day_of_month: parsed.data.day_of_month,
      account_id: parsed.data.account_id ?? null,
      category_id: parsed.data.category_id ?? null,
      is_active: parsed.data.is_active,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/eur-obligations");
  revalidatePath("/");
  return { ok: true, data: { id: data.id } };
}

export async function deleteObligation(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("eur_obligations")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/eur-obligations");
  return { ok: true, data: undefined };
}

export async function toggleObligation(
  id: string,
  is_active: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("eur_obligations")
    .update({ is_active })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/eur-obligations");
  return { ok: true, data: undefined };
}
