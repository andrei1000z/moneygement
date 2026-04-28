import { redirect } from "next/navigation";

import { FireScreen } from "@/components/features/fire/fire-screen";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FirePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household, default_currency")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) redirect("/");

  // Auto-fill defaults: net worth = sum accounts, annual expenses = sum tx
  // negative ultimele 12 luni.
  const { data: accounts } = await supabase
    .from("accounts")
    .select("current_balance, currency")
    .eq("household_id", profile.active_household)
    .is("archived_at", null);
  const baseCurrency = profile.default_currency ?? "RON";
  const netWorth = (accounts ?? [])
    .filter((a) => a.currency === baseCurrency)
    .reduce((acc, a) => acc + Number(a.current_balance ?? 0), 0);

  const yearAgo = new Date();
  yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);
  const fromIso = yearAgo.toISOString().slice(0, 10);

  const { data: txs } = await supabase
    .from("transactions")
    .select("base_amount, amount, currency")
    .eq("household_id", profile.active_household)
    .eq("is_transfer", false)
    .gte("occurred_on", fromIso)
    .lt("amount", 0);

  const annualExpenses = (txs ?? []).reduce((acc, t) => {
    const baseAmt = Number(t.base_amount ?? t.amount);
    return acc + Math.abs(baseAmt);
  }, 0);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <header className="space-y-2">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
          FIRE Projection
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Independență financiară
        </h1>
        <p className="text-muted-foreground text-sm">
          Lean / Coast / Full FIRE — pure compound interest, fără AI. Schimbă
          parametrii și vezi traiectoria în timp real.
        </p>
      </header>

      <FireScreen
        defaults={{
          net_worth_minor: netWorth,
          annual_expenses_minor: annualExpenses,
          base_currency: baseCurrency,
        }}
      />
    </div>
  );
}
