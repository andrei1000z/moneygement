import { redirect } from "next/navigation";
import { differenceInCalendarDays, parseISO } from "date-fns";

import { TripsScreen } from "@/components/features/trips/trips-screen";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
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

  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .eq("household_id", profile.active_household)
    .is("archived_at", null)
    .order("started_on", { ascending: false });

  // Pentru fiecare trip, sumă cheltuieli cu tag corespunzător.
  const enriched = await Promise.all(
    (trips ?? []).map(async (trip) => {
      const { data: txs } = await supabase
        .from("transactions")
        .select("amount, currency, base_amount")
        .eq("household_id", profile.active_household!)
        .contains("tags", [trip.tag])
        .lt("amount", 0);
      const spentMinor = (txs ?? []).reduce(
        (acc, t) => acc + Math.abs(Number(t.base_amount ?? t.amount)),
        0,
      );
      const today = new Date();
      const start = parseISO(trip.started_on);
      const end = trip.ended_on ? parseISO(trip.ended_on) : null;
      const daysUntilStart = differenceInCalendarDays(start, today);
      const daysSinceEnd = end ? differenceInCalendarDays(today, end) : null;
      const isActive =
        start <= today && (!end || end >= today);
      return {
        ...trip,
        spent_minor: spentMinor,
        tx_count: (txs ?? []).length,
        days_until_start: daysUntilStart,
        days_since_end: daysSinceEnd,
        is_active: isActive,
      };
    }),
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <header className="space-y-2">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
          Călătorii
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Excursii și mini-vacanțe
        </h1>
        <p className="text-muted-foreground text-sm">
          Tag-uri auto pe tranzacții, anomaly detector ignoră trip-uri,
          buget separat envelope-style.
        </p>
      </header>
      <TripsScreen trips={enriched} />
    </div>
  );
}
