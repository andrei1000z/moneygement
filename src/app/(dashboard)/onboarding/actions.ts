"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type DemoStats = {
  accounts: number;
  transactions: number;
  budgets: number;
  goals: number;
};

/**
 * Populează gospodăria cu date demo: 3 conturi (cont curent RON, savings
 * EUR, numerar), 80 tranzacții pe ultimele 90 zile cu merchanți români
 * realiști, 4 bugete pe luna curentă, 1 goal. Idempotent — dacă există
 * deja conturi, nu inserează.
 */
export async function seedDemoData(): Promise<ActionResult<DemoStats>> {
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

  // Idempotență: dacă userul are deja conturi, nu seedăm.
  const { count: existingCount } = await supabase
    .from("accounts")
    .select("*", { count: "exact", head: true })
    .eq("household_id", householdId)
    .is("archived_at", null);
  if ((existingCount ?? 0) > 0) {
    return {
      ok: false,
      error: "Ai deja conturi. Demo seed-ul rulează doar pe gospodării goale.",
    };
  }

  // ---- 1. Conturi ----
  const { data: accounts, error: accErr } = await supabase
    .from("accounts")
    .insert([
      {
        household_id: householdId,
        owner_id: user.id,
        name: "Cont curent BT",
        type: "checking",
        currency: "RON",
        bank_name: "Banca Transilvania",
        initial_balance: 350000,
        current_balance: 350000,
        is_shared: true,
        color: "#003399",
        icon: "🏦",
      },
      {
        household_id: householdId,
        owner_id: user.id,
        name: "Economii Revolut",
        type: "savings",
        currency: "EUR",
        bank_name: "Revolut",
        initial_balance: 250000,
        current_balance: 250000,
        is_shared: true,
        color: "#FFCC00",
        icon: "💰",
      },
      {
        household_id: householdId,
        owner_id: user.id,
        name: "Numerar",
        type: "cash",
        currency: "RON",
        initial_balance: 30000,
        current_balance: 30000,
        is_shared: true,
        color: "#16a34a",
        icon: "💵",
      },
    ])
    .select("id, name, currency, type");
  if (accErr || !accounts) {
    return { ok: false, error: accErr?.message ?? "Eroare creare conturi" };
  }

  const checkingAccount = accounts.find((a) => a.type === "checking")!;
  const cashAccount = accounts.find((a) => a.type === "cash")!;

  // ---- 2. Categorii (deja seeded de trigger) ----
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, type")
    .eq("household_id", householdId);
  const catId = (name: string) =>
    categories?.find((c) => c.name === name)?.id ?? null;

  // ---- 3. Tranzacții — 80 pe ultimele 90 zile ----
  type TxTemplate = {
    payee: string;
    category: string;
    minAmount: number;
    maxAmount: number;
    weight: number;
    incomeOf?: number; // negativ default
  };

  const merchants: TxTemplate[] = [
    { payee: "Lidl", category: "Mâncare", minAmount: 4000, maxAmount: 18000, weight: 8 },
    { payee: "Kaufland", category: "Mâncare", minAmount: 6000, maxAmount: 22000, weight: 6 },
    { payee: "Mega Image", category: "Mâncare", minAmount: 2000, maxAmount: 8000, weight: 7 },
    { payee: "Carrefour", category: "Cumpărături", minAmount: 8000, maxAmount: 35000, weight: 4 },
    { payee: "OMV", category: "Combustibil", minAmount: 12000, maxAmount: 28000, weight: 3 },
    { payee: "Petrom", category: "Combustibil", minAmount: 10000, maxAmount: 25000, weight: 2 },
    { payee: "Bolt", category: "Transport", minAmount: 1500, maxAmount: 6000, weight: 5 },
    { payee: "Glovo", category: "Restaurante", minAmount: 4000, maxAmount: 12000, weight: 4 },
    { payee: "Tazz", category: "Restaurante", minAmount: 3500, maxAmount: 10000, weight: 3 },
    { payee: "McDonald's", category: "Restaurante", minAmount: 2500, maxAmount: 8000, weight: 2 },
    { payee: "Starbucks", category: "Restaurante", minAmount: 1500, maxAmount: 4000, weight: 2 },
    { payee: "eMAG", category: "Cumpărături", minAmount: 5000, maxAmount: 80000, weight: 2 },
    { payee: "Netflix", category: "Abonamente", minAmount: 4499, maxAmount: 4499, weight: 1 },
    { payee: "Spotify", category: "Abonamente", minAmount: 2499, maxAmount: 2499, weight: 1 },
    { payee: "Digi Mobil", category: "Internet & Telefonie", minAmount: 5000, maxAmount: 9000, weight: 1 },
    { payee: "Orange", category: "Internet & Telefonie", minAmount: 3500, maxAmount: 7000, weight: 1 },
    { payee: "Electrica", category: "Utilități", minAmount: 8000, maxAmount: 22000, weight: 1 },
    { payee: "Apa Nova", category: "Utilități", minAmount: 4000, maxAmount: 9000, weight: 1 },
    { payee: "Farmacia Catena", category: "Sănătate", minAmount: 2000, maxAmount: 9000, weight: 2 },
    { payee: "Decathlon", category: "Sport & Wellness", minAmount: 4000, maxAmount: 25000, weight: 1 },
    { payee: "Salariu", category: "Salariu", minAmount: 650000, maxAmount: 720000, weight: 1, incomeOf: 1 },
  ];

  const totalWeight = merchants.reduce((acc, m) => acc + m.weight, 0);
  function pickMerchant(): TxTemplate {
    let n = Math.random() * totalWeight;
    for (const m of merchants) {
      n -= m.weight;
      if (n <= 0) return m;
    }
    return merchants[0]!;
  }

  const txs: Array<Record<string, unknown>> = [];
  const today = new Date();
  // 2 salarii: 5 și 35 zile în spate (luna curentă + luna trecută)
  const salaryDates = [25, 55].map((d) => {
    const dt = new Date(today);
    dt.setUTCDate(dt.getUTCDate() - d);
    return dt.toISOString().slice(0, 10);
  });
  for (const date of salaryDates) {
    txs.push({
      household_id: householdId,
      user_id: user.id,
      account_id: checkingAccount.id,
      occurred_on: date,
      amount: 680000 + Math.floor(Math.random() * 40000),
      currency: "RON",
      payee: "Salariu",
      category_id: catId("Salariu"),
      source: "manual",
      status: "cleared",
      ownership: "mine",
      is_transfer: false,
      tags: [],
    });
  }

  // 78 expenses
  for (let i = 0; i < 78; i++) {
    const m = pickMerchant();
    if (m.incomeOf) continue;
    const daysAgo = Math.floor(Math.random() * 90);
    const dt = new Date(today);
    dt.setUTCDate(dt.getUTCDate() - daysAgo);
    const amount = -(
      m.minAmount + Math.floor(Math.random() * (m.maxAmount - m.minAmount + 1))
    );
    const useCash = Math.random() < 0.15;
    txs.push({
      household_id: householdId,
      user_id: user.id,
      account_id: useCash ? cashAccount.id : checkingAccount.id,
      occurred_on: dt.toISOString().slice(0, 10),
      amount,
      currency: "RON",
      payee: m.payee,
      category_id: catId(m.category),
      source: "manual",
      status: "cleared",
      ownership: "mine",
      is_transfer: false,
      tags: [],
    });
  }

  // Insert în batch.
  const { error: txErr } = await supabase.from("transactions").insert(txs);
  if (txErr) {
    return { ok: false, error: `Tranzacții: ${txErr.message}` };
  }

  // ---- 4. Bugete pentru luna curentă ----
  const monthStart = new Date(today);
  monthStart.setUTCDate(1);
  const monthIso = monthStart.toISOString().slice(0, 10);

  const budgetTemplates = [
    { name: "Mâncare", amount: 80000 },
    { name: "Combustibil", amount: 60000 },
    { name: "Restaurante", amount: 40000 },
    { name: "Abonamente", amount: 12000 },
  ];

  const budgetRows = budgetTemplates
    .map((b) => {
      const cid = catId(b.name);
      if (!cid) return null;
      return {
        household_id: householdId,
        category_id: cid,
        month: monthIso,
        amount: b.amount,
        currency: "RON",
        rollover: false,
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  const { error: budErr } = await supabase
    .from("budgets")
    .insert(budgetRows);
  if (budErr) {
    return { ok: false, error: `Bugete: ${budErr.message}` };
  }

  // ---- 5. 1 Goal ----
  const oneYear = new Date(today);
  oneYear.setUTCFullYear(oneYear.getUTCFullYear() + 1);
  await supabase.from("goals").insert({
    household_id: householdId,
    name: "Vacanță de vară 2027",
    target_amount: 500000,
    current_amount: 75000,
    currency: "RON",
    target_date: oneYear.toISOString().slice(0, 10),
    kind: "savings",
  });

  revalidatePath("/", "layout");
  return {
    ok: true,
    data: {
      accounts: accounts.length,
      transactions: txs.length,
      budgets: budgetRows.length,
      goals: 1,
    },
  };
}

export async function clearDemoData(): Promise<ActionResult> {
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

  // Șterge toate tranzacțiile + bugetele + goals + accounts.
  await supabase.from("transactions").delete().eq("household_id", householdId);
  await supabase.from("budgets").delete().eq("household_id", householdId);
  await supabase.from("goals").delete().eq("household_id", householdId);
  await supabase.from("accounts").delete().eq("household_id", householdId);

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
