"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  bulkPatchSchema,
  splitItemSchema,
  transactionInputSchema,
  type BulkPatch,
  type SplitItem,
  type TransactionInput,
} from "@/lib/validation/transactions";
import { firstZodMessage } from "@/lib/zod-utils";
import type { Database, TxStatus, Ownership, TxSource } from "@/types/database";

export type { TransactionInput, SplitItem, BulkPatch };

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

// ---------- create -------------------------------------------------------
export async function createTransaction(
  input: TransactionInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = transactionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  type TxInsert = Database["public"]["Tables"]["transactions"]["Insert"];
  const v = parsed.data;
  const insert: TxInsert = {
    household_id: c.householdId,
    account_id: v.account_id,
    user_id: c.user.id,
    occurred_on: v.occurred_on,
    amount: v.amount,
    currency: v.currency,
    payee: emptyToNull(v.payee),
    merchant_id: v.merchant_id ?? null,
    category_id: v.category_id ?? null,
    notes: emptyToNull(v.notes),
    tags: v.tags ?? [],
    status: (v.status ?? "cleared") as TxStatus,
    ownership: (v.ownership ?? "mine") as Ownership,
    original_amount: v.original_amount ?? null,
    original_currency: v.original_currency ?? null,
    source: (v.source ?? "manual") as TxSource,
    is_transfer: v.is_transfer ?? false,
    transfer_pair_id: v.transfer_pair_id ?? null,
  };

  const { data, error } = await c.supabase
    .from("transactions")
    .insert(insert)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  return { ok: true, data: { id: data.id } };
}

// ---------- update -------------------------------------------------------
export async function updateTransaction(
  id: string,
  input: TransactionInput,
): Promise<ActionResult> {
  const parsed = transactionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  type TxUpdate = Database["public"]["Tables"]["transactions"]["Update"];
  const v = parsed.data;
  const patch: TxUpdate = {
    account_id: v.account_id,
    occurred_on: v.occurred_on,
    amount: v.amount,
    currency: v.currency,
    payee: emptyToNull(v.payee),
    merchant_id: v.merchant_id ?? null,
    category_id: v.category_id ?? null,
    notes: emptyToNull(v.notes),
    tags: v.tags ?? [],
    status: (v.status ?? "cleared") as TxStatus,
    ownership: (v.ownership ?? "mine") as Ownership,
    original_amount: v.original_amount ?? null,
    original_currency: v.original_currency ?? null,
  };

  const { error } = await c.supabase
    .from("transactions")
    .update(patch)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  return { ok: true, data: undefined };
}

// ---------- delete -------------------------------------------------------
export async function deleteTransaction(id: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  const { error } = await c.supabase
    .from("transactions")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  return { ok: true, data: undefined };
}

// ---------- split --------------------------------------------------------

export async function splitTransaction(
  id: string,
  splits: SplitItem[],
): Promise<ActionResult<{ ids: string[] }>> {
  const parsed = z.array(splitItemSchema).min(2).max(20).safeParse(splits);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  // Citim originala pentru a-i copia metadatele.
  const { data: original, error: fetchError } = await c.supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError || !original) {
    return { ok: false, error: fetchError?.message ?? "Tranzacție inexistentă" };
  }
  if (original.is_transfer) {
    return { ok: false, error: "Transferurile nu se pot split-ui" };
  }

  // Suma split-urilor trebuie să egaleze suma originală.
  const totalSplit = parsed.data.reduce((acc, s) => acc + s.amount, 0);
  if (totalSplit !== original.amount) {
    return {
      ok: false,
      error: `Suma split-urilor (${totalSplit}) nu egalează totalul (${original.amount})`,
    };
  }

  type TxInsert = Database["public"]["Tables"]["transactions"]["Insert"];

  // Inserăm copii — moștenesc account, currency, occurred_on, ownership de la original.
  const children: TxInsert[] = parsed.data.map((s) => ({
    household_id: original.household_id,
    account_id: original.account_id,
    user_id: c.user.id,
    occurred_on: original.occurred_on,
    amount: s.amount,
    currency: original.currency,
    payee: emptyToNull(s.payee) ?? original.payee,
    merchant_id: original.merchant_id,
    category_id: s.category_id ?? null,
    notes: emptyToNull(s.notes) ?? null,
    tags: [...(original.tags ?? []), `split:${original.id}`, ...(s.tags ?? [])],
    status: original.status,
    ownership: original.ownership,
    source: "manual" as const,
    is_transfer: false,
    // Marcăm ca având parent prin tag — `transfer_pair_id` rămâne NULL
    // conform spec.
    transfer_pair_id: null,
  }));

  const { data: inserted, error: insertError } = await c.supabase
    .from("transactions")
    .insert(children)
    .select("id");
  if (insertError) return { ok: false, error: insertError.message };

  // Marcăm originala ca void — nu o ștergem, păstrăm audit trail.
  const { error: voidError } = await c.supabase
    .from("transactions")
    .update({ status: "void" })
    .eq("id", id);
  if (voidError) return { ok: false, error: voidError.message };

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  return { ok: true, data: { ids: (inserted ?? []).map((r) => r.id) } };
}

// ---------- linkTransfer -------------------------------------------------
export async function linkTransfer(
  txAId: string,
  txBId: string,
): Promise<ActionResult> {
  if (txAId === txBId) {
    return { ok: false, error: "Nu poți lega o tranzacție de ea însăși" };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  // Caută categoria system "Transferuri & Economii" (seed-ul rulează
  // automat la household creation, deci ar trebui să existe).
  const { data: transferCat } = await c.supabase
    .from("categories")
    .select("id")
    .eq("household_id", c.householdId)
    .eq("type", "transfer")
    .eq("is_system", true)
    .limit(1)
    .maybeSingle();

  const r1 = await c.supabase
    .from("transactions")
    .update({
      is_transfer: true,
      transfer_pair_id: txBId,
      category_id: transferCat?.id ?? null,
    })
    .eq("id", txAId);
  if (r1.error) return { ok: false, error: r1.error.message };

  const r2 = await c.supabase
    .from("transactions")
    .update({
      is_transfer: true,
      transfer_pair_id: txAId,
      category_id: transferCat?.id ?? null,
    })
    .eq("id", txBId);
  if (r2.error) return { ok: false, error: r2.error.message };

  revalidatePath("/transactions");
  return { ok: true, data: undefined };
}

// ---------- bulkUpdate ---------------------------------------------------

export async function bulkUpdate(
  ids: string[],
  patch: BulkPatch,
): Promise<ActionResult<{ count: number }>> {
  if (ids.length === 0) {
    return { ok: false, error: "Nicio tranzacție selectată" };
  }
  const parsed = bulkPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  if (parsed.data.delete) {
    const { error, count } = await c.supabase
      .from("transactions")
      .delete({ count: "exact" })
      .in("id", ids);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    return { ok: true, data: { count: count ?? ids.length } };
  }

  type TxUpdate = Database["public"]["Tables"]["transactions"]["Update"];
  const updates: TxUpdate = {};
  if (parsed.data.category_id !== undefined) {
    updates.category_id = parsed.data.category_id;
  }
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.ownership !== undefined) {
    updates.ownership = parsed.data.ownership;
  }

  // add_tags presupune merge per-rând — facem un update incremental.
  if (parsed.data.add_tags && parsed.data.add_tags.length > 0) {
    const tags = parsed.data.add_tags;
    const { data: existing, error: fetchError } = await c.supabase
      .from("transactions")
      .select("id, tags")
      .in("id", ids);
    if (fetchError) return { ok: false, error: fetchError.message };
    for (const row of existing ?? []) {
      const merged = Array.from(new Set([...(row.tags ?? []), ...tags]));
      const { error } = await c.supabase
        .from("transactions")
        .update({ ...updates, tags: merged })
        .eq("id", row.id);
      if (error) return { ok: false, error: error.message };
    }
    revalidatePath("/transactions");
    return { ok: true, data: { count: existing?.length ?? 0 } };
  }

  const { error, count } = await c.supabase
    .from("transactions")
    .update(updates, { count: "exact" })
    .in("id", ids);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  return { ok: true, data: { count: count ?? ids.length } };
}

// ---------- setOwnership -------------------------------------------------
export async function setOwnership(
  id: string,
  ownership: Ownership,
): Promise<ActionResult> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  const { error } = await c.supabase
    .from("transactions")
    .update({ ownership })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/transactions");
  return { ok: true, data: undefined };
}

// ---------- comments (legate de tx_detail) -------------------------------
export async function addComment(
  transactionId: string,
  body: string,
  emoji?: string | null,
): Promise<ActionResult<{ id: string }>> {
  const text = body.trim();
  if (text.length === 0) return { ok: false, error: "Comentariu gol" };
  if (text.length > 1000) return { ok: false, error: "Comentariu prea lung" };
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };

  const { data, error } = await c.supabase
    .from("tx_comments")
    .insert({
      transaction_id: transactionId,
      user_id: c.user.id,
      body: text,
      emoji: emoji ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/transactions");
  return { ok: true, data: { id: data.id } };
}
