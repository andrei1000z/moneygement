import { redirect } from "next/navigation";

import { EurObligationsScreen } from "@/components/features/eur-obligations/eur-obligations-screen";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EurObligationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) redirect("/");

  const { data: obligations } = await supabase
    .from("eur_obligations")
    .select("*")
    .eq("household_id", profile.active_household)
    .order("day_of_month", { ascending: true });

  // Curs EUR/RON curent (cea mai recentă rate).
  const { data: latestRate } = await supabase
    .from("exchange_rates")
    .select("rate, rate_date")
    .eq("base", "EUR")
    .eq("quote", "RON")
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Rate de acum 12 luni (pentru delta).
  const yearAgo = new Date();
  yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);
  const { data: yearAgoRate } = await supabase
    .from("exchange_rates")
    .select("rate, rate_date")
    .eq("base", "EUR")
    .eq("quote", "RON")
    .lte("rate_date", yearAgo.toISOString().slice(0, 10))
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Istoric FX 12 luni pentru chart per obligație.
  const { data: history } = await supabase
    .from("eur_obligations_fx_history")
    .select("*")
    .eq("household_id", profile.active_household)
    .order("rate_date", { ascending: true });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <header className="space-y-2">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
          Obligații EUR
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Chirie, asigurări și alte plăți în euro
        </h1>
        <p className="text-muted-foreground text-sm">
          Tracking impact FX pe ultimele 12 luni vs cursul actual BNR.
        </p>
      </header>
      <EurObligationsScreen
        obligations={obligations ?? []}
        currentRate={latestRate?.rate ? Number(latestRate.rate) : null}
        yearAgoRate={yearAgoRate?.rate ? Number(yearAgoRate.rate) : null}
        history={(history ?? []).map((h) => ({
          obligation_id: h.id,
          label: h.label,
          rate_date: h.rate_date,
          eur_to_ron: Number(h.eur_to_ron),
          estimated_ron_minor: Number(h.estimated_ron_minor),
        }))}
      />
    </div>
  );
}
