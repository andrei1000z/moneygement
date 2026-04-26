"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { firstZodMessage } from "@/lib/zod-utils";
import type { Database } from "@/types/database";

export const merchantInputSchema = z.object({
  name: z.string().trim().min(1, "Numele e obligatoriu").max(80),
  logo_url: z
    .string()
    .url("URL invalid")
    .optional()
    .nullable()
    .or(z.literal("")),
  default_category_id: z.string().uuid().nullable().optional(),
  website: z
    .string()
    .url("URL invalid")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type MerchantInput = z.infer<typeof merchantInputSchema>;

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type ResolvedContext =
  | { ok: false; error: string }
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      user: { id: string };
      householdId: string;
    };

async function ctx(): Promise<ResolvedContext> {
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

function emptyToNull(v: string | null | undefined) {
  if (!v) return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function createMerchant(
  input: MerchantInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = merchantInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  type MerchantInsert = Database["public"]["Tables"]["merchants"]["Insert"];
  const { data, error } = await c.supabase
    .from("merchants")
    .insert({
      household_id: c.householdId,
      name: parsed.data.name,
      logo_url: emptyToNull(parsed.data.logo_url),
      default_category_id: parsed.data.default_category_id ?? null,
      website: emptyToNull(parsed.data.website),
    } satisfies MerchantInsert)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/merchants");
  return { ok: true, data: { id: data.id } };
}

export async function updateMerchant(
  id: string,
  input: MerchantInput,
): Promise<ActionResult> {
  const parsed = merchantInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  type MerchantUpdate = Database["public"]["Tables"]["merchants"]["Update"];
  const { error } = await c.supabase
    .from("merchants")
    .update({
      name: parsed.data.name,
      logo_url: emptyToNull(parsed.data.logo_url),
      default_category_id: parsed.data.default_category_id ?? null,
      website: emptyToNull(parsed.data.website),
    } satisfies MerchantUpdate)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/merchants");
  return { ok: true, data: undefined };
}

export async function setDefaultCategory(
  merchantId: string,
  categoryId: string | null,
): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  const { error } = await c.supabase
    .from("merchants")
    .update({ default_category_id: categoryId })
    .eq("id", merchantId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/merchants");
  return { ok: true, data: undefined };
}

export async function deleteMerchant(id: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  const { error } = await c.supabase.from("merchants").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/merchants");
  return { ok: true, data: undefined };
}
