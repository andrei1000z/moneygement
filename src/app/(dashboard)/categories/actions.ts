"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { toMinor } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { firstZodMessage } from "@/lib/zod-utils";
import type { Database, CategoryType } from "@/types/database";

const CATEGORY_TYPES = ["income", "expense", "transfer"] as const;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Numele e obligatoriu").max(60),
  type: z.enum(CATEGORY_TYPES),
  parent_id: z.string().uuid().nullable().optional(),
  icon: z.string().trim().max(8).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Culoare invalidă")
    .optional()
    .nullable(),
  /** În unități majore (ex: 350.50 RON). Convertit în bani la insert. */
  budget_amount: z.number().nonnegative().optional().nullable(),
  budget_currency: z.string().length(3).optional().nullable(),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

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

export async function createCategory(
  input: CategoryInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };
  const v = parsed.data;

  type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
  const insert: CategoryInsert = {
    household_id: c.householdId,
    name: v.name,
    type: v.type as CategoryType,
    parent_id: v.parent_id ?? null,
    icon: emptyToNull(v.icon),
    color: emptyToNull(v.color),
    budget_amount:
      v.budget_amount && v.budget_amount > 0 && v.budget_currency
        ? Number(toMinor(v.budget_amount, v.budget_currency))
        : null,
  };

  const { data, error } = await c.supabase
    .from("categories")
    .insert(insert)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/categories");
  return { ok: true, data: { id: data.id } };
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<ActionResult> {
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };
  const v = parsed.data;

  type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];
  const patch: CategoryUpdate = {
    name: v.name,
    type: v.type as CategoryType,
    icon: emptyToNull(v.icon),
    color: emptyToNull(v.color),
    budget_amount:
      v.budget_amount && v.budget_amount > 0 && v.budget_currency
        ? Number(toMinor(v.budget_amount, v.budget_currency))
        : null,
  };

  const { error } = await c.supabase
    .from("categories")
    .update(patch)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/categories");
  return { ok: true, data: undefined };
}

export async function archiveCategory(id: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  // Categoriile system nu se pot șterge — UI-ul le marchează cu lock.
  // Le verificăm aici și ca defensivă suplimentară.
  const { data: existing } = await c.supabase
    .from("categories")
    .select("is_system")
    .eq("id", id)
    .single();
  if (existing?.is_system) {
    return { ok: false, error: "Categoriile system nu pot fi arhivate" };
  }

  const { error } = await c.supabase
    .from("categories")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/categories");
  return { ok: true, data: undefined };
}
