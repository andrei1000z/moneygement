"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { matchMerchant } from "@/lib/banking/merchant-matcher";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { firstZodMessage } from "@/lib/zod-utils";
import type { Database } from "@/types/database";

const importTxSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount_minor: z.string().regex(/^-?\d+$/), // serialized bigint
  currency: z.string().length(3),
  payee: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  external_id: z.string().min(1).max(120),
});

const bulkImportSchema = z.object({
  account_id: z.string().uuid(),
  bank: z.enum(["bt24", "bcr", "ing", "revolut", "cec", "raiffeisen"]),
  transactions: z.array(importTxSchema).min(1).max(2000),
});

export type BulkImportInput = z.infer<typeof bulkImportSchema>;

export type BulkImportResult =
  | {
      ok: true;
      inserted: number;
      duplicates: number;
      errors: number;
    }
  | { ok: false; error: string };

/**
 * Bulk-import al tranzacțiilor parsate de un parser CSV. Rulează în batch-uri
 * de 200, cu dedup pe (account_id, external_id). Auto-rulează merchant
 * matcher pentru a popula `payee`.
 */
export async function bulkImport(
  input: BulkImportInput,
): Promise<BulkImportResult> {
  const parsed = bulkImportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  // Rate-limit: max 5 importuri / 5 minute / user.
  const rl = rateLimit(`import:${user.id}`, 5, 5 * 60 * 1000);
  if (!rl.ok) {
    return {
      ok: false,
      error: `Prea multe importuri. Reîncearcă în ${Math.ceil(
        rl.retryAfterMs / 1000,
      )}s.`,
    };
  }

  // Verifică contul aparține household-ului utilizatorului (RLS rezolvă,
  // dar răspundem politicos).
  const { data: account } = await supabase
    .from("accounts")
    .select("id, household_id, currency")
    .eq("id", parsed.data.account_id)
    .single();
  if (!account) return { ok: false, error: "Cont inexistent sau fără acces." };

  type TxInsert = Database["public"]["Tables"]["transactions"]["Insert"];

  // Pre-load merchanți existenți ca să refolosim id-urile.
  const { data: merchants } = await supabase
    .from("merchants")
    .select("id, name")
    .eq("household_id", account.household_id);
  const merchantByName = new Map(
    (merchants ?? []).map((m) => [m.name.toLowerCase(), m.id]),
  );

  // Pre-load categories cu hint-uri (potriviri pe nume canonical).
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("household_id", account.household_id);
  const categoryByName = new Map(
    (categories ?? []).map((c) => [c.name.toLowerCase(), c.id]),
  );

  const rows: TxInsert[] = [];
  for (const tx of parsed.data.transactions) {
    const text = `${tx.payee ?? ""} ${tx.notes ?? ""}`.trim();
    const match = matchMerchant(text);
    const payee = tx.payee?.trim() || match.payee;

    const merchantId = merchantByName.get(payee.toLowerCase()) ?? null;
    const categoryId = match.category_hint
      ? categoryByName.get(match.category_hint.toLowerCase()) ?? null
      : null;

    // Bigint pe sârmă: postgrest serializează `bigint` ca number/string. Folosim
    // Number() — sumele rezonabile (până la 2^53 = ~90 mld lei) sunt safe.
    const amountNum = Number(BigInt(tx.amount_minor));

    rows.push({
      household_id: account.household_id,
      account_id: parsed.data.account_id,
      user_id: user.id,
      occurred_on: tx.date,
      amount: amountNum,
      currency: tx.currency,
      payee,
      notes: tx.notes ?? null,
      external_id: tx.external_id,
      source: "import",
      merchant_id: merchantId,
      category_id: categoryId,
      tags: [],
      status: "cleared",
      ownership: "mine",
      is_transfer: false,
    });
  }

  let inserted = 0;
  let duplicates = 0;
  let errors = 0;

  // Insert chunked. Pe (account_id, external_id) avem unique constraint,
  // așa că conflict → ignore.
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("transactions")
      .upsert(slice, {
        onConflict: "account_id,external_id",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      errors += slice.length;
      continue;
    }
    inserted += data?.length ?? 0;
    duplicates += slice.length - (data?.length ?? 0);
  }

  revalidatePath("/transactions");
  revalidatePath("/accounts");

  return {
    ok: true,
    inserted,
    duplicates,
    errors,
  };
}
