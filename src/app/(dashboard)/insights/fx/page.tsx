import { redirect } from "next/navigation";

import { FxDashboard } from "@/components/features/insights/fx-dashboard";
import { TRACKED_CURRENCIES } from "@/lib/fx";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ pair?: string }>;

const ALLOWED = new Set(TRACKED_CURRENCIES);

export default async function FxPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const requested = params.pair?.toUpperCase();
  const base = requested && ALLOWED.has(requested as never)
    ? (requested as (typeof TRACKED_CURRENCIES)[number])
    : "EUR";

  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setUTCFullYear(today.getUTCFullYear() - 1);
  const oneYearAgoIso = oneYearAgo.toISOString().slice(0, 10);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(today.getUTCDate() - 30);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString().slice(0, 10);

  const [yearRes, recentRes] = await Promise.all([
    supabase
      .from("exchange_rates")
      .select("rate_date, rate, source")
      .eq("base", base)
      .eq("quote", "RON")
      .gte("rate_date", oneYearAgoIso)
      .order("rate_date", { ascending: true }),
    supabase
      .from("exchange_rates")
      .select("rate_date, rate, source")
      .eq("base", base)
      .eq("quote", "RON")
      .gte("rate_date", thirtyDaysAgoIso)
      .order("rate_date", { ascending: false }),
  ]);

  const yearSeries = (yearRes.data ?? []).map((r) => ({
    date: r.rate_date,
    rate: Number(r.rate),
    source: r.source as string,
  }));

  const recent = (recentRes.data ?? []).map((r) => ({
    date: r.rate_date,
    rate: Number(r.rate),
    source: r.source as string,
  }));

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Curs valutar</h1>
        <p className="text-muted-foreground text-sm">
          Sursă: BNR (zilnic, zile lucrătoare). Fallback Frankfurter când
          BNR e neaccesibil.
        </p>
      </header>

      <FxDashboard base={base} yearSeries={yearSeries} recent={recent} />
    </div>
  );
}
