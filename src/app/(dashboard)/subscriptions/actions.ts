"use server";

import { revalidatePath } from "next/cache";

import { detectSubscriptions } from "@/lib/ai/subscriptions";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Rulează detectorul pe ultimele 18 luni de tranzacții și
 * upsert-uiește rezultatele în `detected_subscriptions`.
 */
export async function runSubscriptionDetector(): Promise<
  ActionResult<{ detected: number }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const rl = rateLimit(`subs:${user.id}`, 5, 60 * 60 * 1000);
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

  const eighteenMonthsAgo = new Date();
  eighteenMonthsAgo.setUTCMonth(eighteenMonthsAgo.getUTCMonth() - 18);
  const fromDate = eighteenMonthsAgo.toISOString().slice(0, 10);

  const { data: txs, error } = await supabase
    .from("transactions")
    .select("payee, notes, amount, currency, occurred_on")
    .eq("household_id", profile.active_household)
    .eq("is_transfer", false)
    .gte("occurred_on", fromDate);
  if (error) return { ok: false, error: error.message };

  const detected = detectSubscriptions(
    (txs ?? []).map((t) => ({
      payee: t.payee,
      notes: t.notes,
      amount: Number(t.amount),
      currency: t.currency,
      occurred_on: t.occurred_on,
    })),
  );

  // Upsert în detected_subscriptions. Cheia naturală: (household_id, payee, cadence, currency).
  const rows = detected.map((s) => ({
    household_id: profile.active_household!,
    payee: s.payee_display.slice(0, 200),
    cadence: s.cadence,
    median_amount: s.median_amount,
    currency: s.currency,
    occurrences_count: s.occurrences_count,
    first_seen: s.first_seen,
    last_seen: s.last_seen,
    price_hike_alert: s.price_hike_pct,
  }));

  if (rows.length > 0) {
    const { error: upErr } = await supabase
      .from("detected_subscriptions")
      .upsert(rows, {
        onConflict: "household_id,payee,cadence,currency",
      });
    if (upErr) return { ok: false, error: upErr.message };
  }

  revalidatePath("/subscriptions");
  return { ok: true, data: { detected: rows.length } };
}

export async function setSubscriptionStatus(
  id: string,
  status: "active" | "paused" | "cancelled",
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const { error } = await supabase
    .from("detected_subscriptions")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/subscriptions");
  return { ok: true, data: undefined };
}
