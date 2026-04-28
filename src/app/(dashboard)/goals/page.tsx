import { redirect } from "next/navigation";

import { GoalsScreen } from "@/components/features/goals/goals-screen";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
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

  const { data: household } = await supabase
    .from("households")
    .select("roundup_goal_id, roundup_active, base_currency")
    .eq("id", profile.active_household)
    .single();

  // Calculează cât s-a adunat din rotunjiri luna asta. Heuristic: orice
  // tx pozitiv pe goal-ul activ în luna curentă, source != bank_sync.
  // Mai simplu: nu există tabela goal_contributions explicită, dar
  // putem aproxima diferența current_amount din ultima zi a lunii trecute.
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const monthIso = monthStart.toISOString().slice(0, 10);

  let roundupThisMonth = 0;
  if (household?.roundup_goal_id && household.roundup_active) {
    // Sum tranzacții manuale negative din luna curentă, pentru estimare:
    // suma diff-ului către 100 e exact contribuția round-up.
    const { data: txs } = await supabase
      .from("transactions")
      .select("amount, source, is_transfer")
      .eq("household_id", profile.active_household)
      .gte("occurred_on", monthIso)
      .lt("amount", 0)
      .neq("source", "bank_sync")
      .eq("is_transfer", false);
    for (const t of txs ?? []) {
      const abs = Math.abs(Number(t.amount));
      const diff = 100 - (abs % 100);
      if (diff !== 100 && diff !== 0) {
        roundupThisMonth += diff;
      }
    }
  }

  return (
    <GoalsScreen
      householdInitial={{
        roundup_goal_id: household?.roundup_goal_id ?? null,
        roundup_active: household?.roundup_active ?? false,
        base_currency: household?.base_currency ?? "RON",
      }}
      roundupThisMonth={roundupThisMonth}
    />
  );
}
