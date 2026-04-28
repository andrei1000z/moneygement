"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  detectIncomeStreams,
  nextExpected,
} from "@/lib/intelligence/salary-detection";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { firstZodMessage } from "@/lib/zod-utils";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const incomeInputSchema = z.object({
  name: z.string().trim().min(1, "Numele e obligatoriu").max(100),
  payer: z.string().trim().min(1, "Plătitorul e obligatoriu").max(200),
  expected_amount: z
    .number()
    .int("Suma trebuie să fie în bani (integer)")
    .positive("Suma trebuie să fie pozitivă"),
  expected_currency: z.string().length(3).default("RON"),
  expected_day_of_month: z.number().int().min(1).max(31).optional(),
  cadence_days: z.number().int().positive().default(30),
  is_active: z.boolean().default(true),
});

export type IncomeInput = z.infer<typeof incomeInputSchema>;

export async function addIncomeStream(
  input: IncomeInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = incomeInputSchema.safeParse(input);
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

  const todayIso = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("income_streams")
    .insert({
      household_id: profile.active_household,
      user_id: user.id,
      name: parsed.data.name,
      payer: parsed.data.payer,
      expected_amount: parsed.data.expected_amount,
      expected_currency: parsed.data.expected_currency,
      expected_day_of_month: parsed.data.expected_day_of_month ?? null,
      cadence_days: parsed.data.cadence_days,
      day_variance: 0,
      confidence: 1.0,
      is_active: parsed.data.is_active,
      source: "manual",
      next_expected_on: parsed.data.expected_day_of_month
        ? nextExpected(todayIso, todayIso, parsed.data.cadence_days)
        : null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/income");
  revalidatePath("/");
  return { ok: true, data: { id: data.id } };
}

export async function deleteIncomeStream(
  id: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const { error } = await supabase.from("income_streams").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/income");
  return { ok: true, data: undefined };
}

/**
 * Rulează detectorul pe ultimele 12 luni de tranzacții pozitive
 * non-transfer și upsert-uiește income_streams (cheia: payer + currency
 * pentru același user).
 */
export async function detectIncomes(): Promise<
  ActionResult<{ detected: number }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const rl = rateLimit(`income-detect:${user.id}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return {
      ok: false,
      error: `Reîncearcă în ${Math.ceil(rl.retryAfterMs / 60000)} min.`,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) {
    return { ok: false, error: "Niciun household activ" };
  }

  const oneYearAgo = new Date();
  oneYearAgo.setUTCMonth(oneYearAgo.getUTCMonth() - 12);
  const fromIso = oneYearAgo.toISOString().slice(0, 10);

  const { data: txs, error } = await supabase
    .from("transactions")
    .select("payee, notes, amount, currency, occurred_on")
    .eq("user_id", user.id)
    .eq("is_transfer", false)
    .gt("amount", 0)
    .gte("occurred_on", fromIso);
  if (error) return { ok: false, error: error.message };

  const detected = detectIncomeStreams(
    (txs ?? []).map((t) => ({
      payee: t.payee,
      notes: t.notes,
      amount: Number(t.amount),
      currency: t.currency,
      occurred_on: t.occurred_on,
    })),
  );

  const todayIso = new Date().toISOString().slice(0, 10);

  // Upsert detectate. Confidence < 0.4 → omis (zgomot).
  const rows = detected
    .filter((d) => d.confidence >= 0.4)
    .map((d) => ({
      household_id: profile.active_household!,
      user_id: user.id,
      name: d.name,
      payer: d.payer.slice(0, 200),
      expected_amount: d.expected_amount,
      expected_currency: d.currency,
      expected_day_of_month: d.expected_day_of_month,
      cadence_days: d.cadence_days,
      day_variance: d.day_variance,
      confidence: d.confidence,
      is_active: true,
      source: "auto" as const,
      last_seen_on: d.last_seen,
      next_expected_on: nextExpected(
        todayIso,
        d.last_seen,
        d.cadence_days,
      ),
    }));

  if (rows.length === 0) {
    return { ok: true, data: { detected: 0 } };
  }

  // Marcăm sursele auto vechi inactive (cele care nu mai apar la detect).
  const detectedPayers = new Set(rows.map((r) => `${r.payer}|${r.expected_currency}`));
  const { data: existing } = await supabase
    .from("income_streams")
    .select("id, payer, expected_currency, source")
    .eq("user_id", user.id)
    .eq("source", "auto")
    .eq("is_active", true);
  for (const e of existing ?? []) {
    const key = `${e.payer ?? ""}|${e.expected_currency}`;
    if (!detectedPayers.has(key)) {
      await supabase
        .from("income_streams")
        .update({ is_active: false })
        .eq("id", e.id);
    }
  }

  // Upsert pe (user_id, payer, expected_currency) — în lipsa unui unique
  // constraint, facem manual SELECT + INSERT/UPDATE.
  let count = 0;
  for (const row of rows) {
    const { data: match } = await supabase
      .from("income_streams")
      .select("id")
      .eq("user_id", user.id)
      .eq("payer", row.payer)
      .eq("expected_currency", row.expected_currency)
      .maybeSingle();

    if (match) {
      await supabase
        .from("income_streams")
        .update({
          name: row.name,
          expected_amount: row.expected_amount,
          expected_day_of_month: row.expected_day_of_month,
          cadence_days: row.cadence_days,
          confidence: row.confidence,
          is_active: true,
          last_seen_on: row.last_seen_on,
          next_expected_on: row.next_expected_on,
        })
        .eq("id", match.id);
    } else {
      await supabase.from("income_streams").insert(row);
    }
    count++;
  }

  revalidatePath("/income");
  revalidatePath("/");
  return { ok: true, data: { detected: count } };
}
