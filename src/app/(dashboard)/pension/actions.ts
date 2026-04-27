"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { firstZodMessage } from "@/lib/zod-utils";

const contributionSchema = z.object({
  contribution_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount_eur: z.number().positive().max(50_000),
  amount_ron: z.number().int().min(0).optional().nullable(),
  provider: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type ContributionInput = z.infer<typeof contributionSchema>;

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function addContribution(
  input: ContributionInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = contributionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }

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

  const { data, error } = await supabase
    .from("pension_contributions")
    .insert({
      household_id: profile.active_household,
      user_id: user.id,
      contribution_date: parsed.data.contribution_date,
      amount_eur: parsed.data.amount_eur,
      amount_ron: parsed.data.amount_ron ?? null,
      provider: parsed.data.provider ?? null,
      notes: parsed.data.notes ?? null,
      deductible: true,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/pension");
  return { ok: true, data: { id: data.id } };
}

export async function deleteContribution(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const { error } = await supabase
    .from("pension_contributions")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/pension");
  return { ok: true, data: undefined };
}
