import { redirect } from "next/navigation";

import { PensionDashboard } from "@/components/features/pension/pension-dashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PensionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentYear = new Date().getUTCFullYear();
  const fiveYearsAgo = currentYear - 5;

  const { data: contributions } = await supabase
    .from("pension_contributions")
    .select(
      "id, year, contribution_date, amount_eur, amount_ron, provider, notes",
    )
    .eq("user_id", user.id)
    .gte("year", fiveYearsAgo)
    .order("contribution_date", { ascending: false });

  // Curent EUR→RON pentru afișare „mai poți deduce X RON".
  const today = new Date().toISOString().slice(0, 10);
  const { data: rate } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("base", "EUR")
    .eq("quote", "RON")
    .lte("rate_date", today)
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Pilon III</h1>
        <p className="text-muted-foreground text-sm">
          Plafon deductibil: 400 EUR/an (Codul Fiscal art. 86). Adaugă
          contribuțiile pe măsură ce le faci.
        </p>
      </header>

      <PensionDashboard
        currentYear={currentYear}
        contributions={(contributions ?? []).map((c) => ({
          id: c.id,
          year: c.year,
          contribution_date: c.contribution_date,
          amount_eur: Number(c.amount_eur),
          amount_ron: c.amount_ron != null ? Number(c.amount_ron) : null,
          provider: c.provider,
          notes: c.notes,
        }))}
        eurToRon={rate ? Number(rate.rate) : null}
      />
    </div>
  );
}
