import { redirect } from "next/navigation";

import { SubscriptionsScreen } from "@/components/features/subscriptions/subscriptions-screen";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
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

  const { data: subscriptions } = await supabase
    .from("detected_subscriptions")
    .select(
      "id, payee, cadence, median_amount, currency, occurrences_count, first_seen, last_seen, status, price_hike_alert",
    )
    .eq("household_id", profile.active_household)
    .order("median_amount", { ascending: false });

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Abonamente</h1>
        <p className="text-muted-foreground text-sm">
          Detectate automat din istoricul plăților. Apasă „Re-scanează&rdquo;
          dacă ai importat tranzacții recent.
        </p>
      </header>
      <SubscriptionsScreen subscriptions={subscriptions ?? []} />
    </div>
  );
}
