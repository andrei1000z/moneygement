import { redirect } from "next/navigation";

import { IncomeStreamsScreen } from "@/components/features/income/income-streams-screen";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function IncomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: streams } = await supabase
    .from("income_streams")
    .select(
      "id, name, payer, expected_amount, expected_currency, expected_day_of_month, cadence_days, confidence, is_active, source, last_seen_on, next_expected_on",
    )
    .eq("user_id", user.id)
    .order("expected_amount", { ascending: false });

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Surse de venit</h1>
        <p className="text-muted-foreground text-sm">
          Detectate automat din salarii, pensii și alte plăți recurente.
        </p>
      </header>

      <IncomeStreamsScreen
        streams={(streams ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          payer: s.payer,
          expected_amount: Number(s.expected_amount),
          expected_currency: s.expected_currency,
          expected_day_of_month: s.expected_day_of_month,
          cadence_days: s.cadence_days,
          confidence: Number(s.confidence),
          is_active: s.is_active,
          source: s.source,
          last_seen_on: s.last_seen_on,
          next_expected_on: s.next_expected_on,
        }))}
      />
    </div>
  );
}
