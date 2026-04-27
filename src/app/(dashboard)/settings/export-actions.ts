"use server";

import { createClient } from "@/lib/supabase/server";

export type ExportResult =
  | { ok: true; format: "csv" | "json"; filename: string; content: string }
  | { ok: false; error: string };

/**
 * Export all household data în CSV (tranzacții) sau JSON (toate tabelele
 * relevante).
 */
export async function exportData(format: "csv" | "json"): Promise<ExportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) {
    return { ok: false, error: "Niciun household activ" };
  }

  const householdId = profile.active_household;
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const { data: txs, error } = await supabase
      .from("transactions")
      .select(
        "occurred_on, payee, amount, currency, category_id, notes, is_transfer, status",
      )
      .eq("household_id", householdId)
      .order("occurred_on", { ascending: false });
    if (error) return { ok: false, error: error.message };

    const header = [
      "Data",
      "Beneficiar",
      "Sumă",
      "Moneda",
      "Categorie",
      "Note",
      "Transfer",
      "Status",
    ].join(",");
    const rows = (txs ?? []).map((t) =>
      [
        t.occurred_on,
        csvCell(t.payee ?? ""),
        (Number(t.amount) / 100).toFixed(2).replace(".", ","),
        t.currency,
        t.category_id ?? "",
        csvCell(t.notes ?? ""),
        t.is_transfer ? "1" : "0",
        t.status,
      ].join(","),
    );
    return {
      ok: true,
      format: "csv",
      filename: `banii-tranzactii-${stamp}.csv`,
      content: `${header}\n${rows.join("\n")}\n`,
    };
  }

  // JSON: toate tabelele relevante.
  const [
    accounts,
    categories,
    merchants,
    transactions,
    budgets,
    goals,
    rules,
    recurring,
  ] = await Promise.all([
    supabase.from("accounts").select("*").eq("household_id", householdId),
    supabase.from("categories").select("*").eq("household_id", householdId),
    supabase.from("merchants").select("*").eq("household_id", householdId),
    supabase
      .from("transactions")
      .select("*")
      .eq("household_id", householdId),
    supabase.from("budgets").select("*").eq("household_id", householdId),
    supabase.from("goals").select("*").eq("household_id", householdId),
    supabase.from("rules").select("*").eq("household_id", householdId),
    supabase
      .from("recurring_transactions")
      .select("*")
      .eq("household_id", householdId),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    household_id: householdId,
    accounts: accounts.data ?? [],
    categories: categories.data ?? [],
    merchants: merchants.data ?? [],
    transactions: transactions.data ?? [],
    budgets: budgets.data ?? [],
    goals: goals.data ?? [],
    rules: rules.data ?? [],
    recurring_transactions: recurring.data ?? [],
  };

  return {
    ok: true,
    format: "json",
    filename: `banii-export-${stamp}.json`,
    content: JSON.stringify(payload, null, 2),
  };
}

function csvCell(value: string): string {
  const trimmed = value.replace(/[\r\n]+/g, " ").trim();
  if (/[",]/.test(trimmed)) {
    return `"${trimmed.replace(/"/g, '""')}"`;
  }
  return trimmed;
}
