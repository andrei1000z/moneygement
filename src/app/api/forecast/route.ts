import "server-only";

import { NextResponse } from "next/server";

import { forecastCashflow, findLowPoint } from "@/lib/forecast/cashflow";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HORIZON = new Set([30, 60, 90]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const horizonParam = parseInt(url.searchParams.get("horizon") ?? "30", 10);
  const horizon = ALLOWED_HORIZON.has(horizonParam) ? horizonParam : 30;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) {
    return NextResponse.json({ error: "Niciun household activ" }, { status: 400 });
  }

  const { data: accounts } = await supabase
    .from("accounts")
    .select("currency, current_balance")
    .eq("household_id", profile.active_household)
    .is("archived_at", null);
  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ points: [], currency: "RON", low: null });
  }

  const currency = accounts[0]?.currency ?? "RON";
  const startingBalance = accounts
    .filter((a) => a.currency === currency)
    .reduce((acc, a) => acc + Number(a.current_balance ?? 0), 0);

  const { data: streams } = await supabase
    .from("income_streams")
    .select("expected_amount, expected_currency, next_expected_on, cadence_days, name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .not("next_expected_on", "is", null);

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
  const fromIso = ninetyDaysAgo.toISOString().slice(0, 10);

  const { data: txs } = await supabase
    .from("transactions")
    .select("amount, currency, occurred_on, is_transfer")
    .eq("household_id", profile.active_household)
    .eq("is_transfer", false)
    .gte("occurred_on", fromIso)
    .lt("amount", 0)
    .eq("currency", currency);

  const totalDiscretionary = (txs ?? []).reduce(
    (acc, t) => acc + Number(t.amount),
    0,
  );
  const dailyDiscretionary = Math.round(totalDiscretionary / 90);

  const { data: recurring } = await supabase
    .from("recurring_transactions")
    .select("payee, amount, currency, next_date, frequency")
    .eq("household_id", profile.active_household)
    .eq("is_active", true)
    .eq("currency", currency);

  const cadenceForFreq: Record<string, number> = {
    daily: 1,
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    quarterly: 91,
    yearly: 365,
  };

  const points = forecastCashflow({
    starting_balance: startingBalance,
    daily_discretionary: dailyDiscretionary,
    recurring: (recurring ?? []).map((r) => ({
      next_due: r.next_date,
      amount: Number(r.amount),
      label: r.payee ?? "Recurent",
      cadence_days: cadenceForFreq[r.frequency ?? "monthly"] ?? 30,
    })),
    income_streams: (streams ?? [])
      .filter((s) => s.expected_currency === currency)
      .map((s) => ({
        next_due: s.next_expected_on!,
        amount: Number(s.expected_amount),
        cadence_days: s.cadence_days,
        label: s.name,
      })),
    horizon_days: horizon as 30 | 60 | 90,
  });

  const low = findLowPoint(points);

  // Threshold low balance: notification_preferences.low_balance_threshold_minor
  // sau 50000 (500 RON) default.
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("low_balance_threshold_minor")
    .eq("user_id", user.id)
    .maybeSingle();
  const threshold =
    prefs?.low_balance_threshold_minor != null
      ? Number(prefs.low_balance_threshold_minor)
      : 50000;

  return NextResponse.json({
    points,
    currency,
    low,
    threshold,
    horizon,
  });
}
