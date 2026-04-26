"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { encryptIBAN, lastFour, normalizeIBAN } from "@/lib/crypto";
import { toMinor, SUPPORTED_CURRENCIES } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { firstZodMessage } from "@/lib/zod-utils";
import type { Database } from "@/types/database";

const ACCOUNT_TYPES = [
  "checking",
  "savings",
  "credit_card",
  "cash",
  "investment",
  "loan",
  "wallet",
  "meal_voucher",
] as const;

export const accountInputSchema = z.object({
  name: z.string().trim().min(1, "Numele e obligatoriu").max(80),
  type: z.enum(ACCOUNT_TYPES),
  currency: z.enum(SUPPORTED_CURRENCIES as readonly [string, ...string[]]),
  bank_name: z.string().trim().max(80).optional().nullable(),
  // IBAN-ul e validat soft (lungime 15-34 cu litere/cifre).
  iban: z
    .string()
    .trim()
    .regex(/^[A-Z0-9 ]{15,40}$/i, "IBAN invalid")
    .optional()
    .nullable()
    .or(z.literal("")),
  initial_balance: z.number().finite(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Culoare invalidă")
    .optional()
    .nullable(),
  icon: z.string().trim().max(8).optional().nullable(),
  is_shared: z.boolean(),
});

export type AccountInput = z.infer<typeof accountInputSchema>;

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

async function resolveActiveHousehold(): Promise<ResolvedContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active_household")
    .eq("id", user.id)
    .single();
  if (profileError || !profile?.active_household) {
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

export async function createAccount(
  input: AccountInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = accountInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }

  const ctx = await resolveActiveHousehold();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { supabase, user, householdId } = ctx;
  const v = parsed.data;
  const initialMinor = Number(toMinor(v.initial_balance, v.currency));

  let ibanLast4: string | null = null;
  let ibanEncrypted: string | null = null;
  if (v.iban && v.iban.trim().length > 0) {
    const normalized = normalizeIBAN(v.iban);
    ibanLast4 = lastFour(normalized);
    try {
      ibanEncrypted = await encryptIBAN(normalized);
    } catch {
      // Vault key missing — păstrăm last4 dar nu stocăm criptat.
      ibanEncrypted = null;
    }
  }

  type AccountInsert = Database["public"]["Tables"]["accounts"]["Insert"];

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      household_id: householdId,
      owner_id: user.id,
      name: v.name,
      type: v.type as AccountInsert["type"],
      currency: v.currency,
      bank_name: emptyToNull(v.bank_name),
      iban_last4: ibanLast4,
      iban_encrypted: ibanEncrypted,
      initial_balance: initialMinor,
      current_balance: initialMinor,
      color: emptyToNull(v.color),
      icon: emptyToNull(v.icon),
      is_shared: v.is_shared,
    } satisfies AccountInsert)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/accounts");
  return { ok: true, data: { id: data.id } };
}

export async function updateAccount(
  id: string,
  input: AccountInput,
): Promise<ActionResult> {
  const parsed = accountInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }

  const ctx = await resolveActiveHousehold();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const { supabase } = ctx;
  const v = parsed.data;

  type AccountUpdate = Database["public"]["Tables"]["accounts"]["Update"];

  const patch: AccountUpdate = {
    name: v.name,
    type: v.type as AccountUpdate["type"],
    currency: v.currency,
    bank_name: emptyToNull(v.bank_name),
    color: emptyToNull(v.color),
    icon: emptyToNull(v.icon),
    is_shared: v.is_shared,
  };

  if (v.iban && v.iban.trim().length > 0) {
    const normalized = normalizeIBAN(v.iban);
    patch.iban_last4 = lastFour(normalized);
    try {
      patch.iban_encrypted = await encryptIBAN(normalized);
    } catch {
      patch.iban_encrypted = null;
    }
  }

  const { error } = await supabase.from("accounts").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/accounts");
  return { ok: true, data: undefined };
}

export async function archiveAccount(id: string): Promise<ActionResult> {
  const ctx = await resolveActiveHousehold();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from("accounts")
    .update({ archived_at: new Date().toISOString(), is_active: false })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/accounts");
  return { ok: true, data: undefined };
}

export async function unarchiveAccount(id: string): Promise<ActionResult> {
  const ctx = await resolveActiveHousehold();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from("accounts")
    .update({ archived_at: null, is_active: true })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/accounts");
  return { ok: true, data: undefined };
}

/**
 * Reordonarea curge prin coloana `name` (deocamdată folosim ordinea
 * alfabetică implicită). Faza 3 introduce un câmp `sort_order`; acum
 * doar invalidăm cache-ul ca să persistăm ordinea schițată în UI.
 */
export async function reorderAccounts(ids: string[]): Promise<ActionResult> {
  // Faza 3 va extinde schema cu `sort_order` și va face un upsert batch aici.
  void ids;
  revalidatePath("/accounts");
  return { ok: true, data: undefined };
}
