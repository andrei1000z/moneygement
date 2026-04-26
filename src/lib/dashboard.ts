import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type DashboardContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email: string | null };
  householdId: string;
  baseCurrency: string;
  fullName: string | null;
};

/**
 * Returnează context-ul dashboard-ului sau null dacă user-ul nu e
 * autentificat / nu are household. Componentele de dashboard tratează
 * cazul de „neautentificat" prin a randa empty state.
 */
export async function getDashboardContext(): Promise<DashboardContext | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household, full_name")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) return null;

  const { data: household } = await supabase
    .from("households")
    .select("base_currency")
    .eq("id", profile.active_household)
    .single();

  return {
    supabase,
    user: { id: user.id, email: user.email ?? null },
    householdId: profile.active_household,
    baseCurrency: household?.base_currency ?? "RON",
    fullName: profile.full_name,
  };
}

// ---------- Net worth -----------------------------------------------------
export type NetWorth = {
  totalMinor: number;
  currency: string;
  /** Per-currency breakdown (în propria monedă, nu convertit). */
  byCurrency: Array<{ currency: string; totalMinor: number }>;
};

export async function getNetWorth(c: DashboardContext): Promise<NetWorth> {
  const { data: accounts } = await c.supabase
    .from("accounts")
    .select("current_balance, currency, type, archived_at")
    .is("archived_at", null);

  const byCurrencyMap = new Map<string, number>();
  for (const a of accounts ?? []) {
    // Pentru loan / credit_card: balance-ul e datorat → tratează ca negativ.
    const adjusted =
      a.type === "loan" || a.type === "credit_card"
        ? -Math.abs(a.current_balance)
        : a.current_balance;
    byCurrencyMap.set(
      a.currency,
      (byCurrencyMap.get(a.currency) ?? 0) + adjusted,
    );
  }
  const byCurrency = Array.from(byCurrencyMap.entries())
    .map(([currency, totalMinor]) => ({ currency, totalMinor }))
    .sort((a, b) =>
      a.currency === c.baseCurrency
        ? -1
        : b.currency === c.baseCurrency
        ? 1
        : a.currency.localeCompare(b.currency),
    );

  // Pentru total în baseCurrency: convertim folosind fx_at (data de azi).
  const today = new Date().toISOString().slice(0, 10);
  let totalMinor = 0;
  for (const row of byCurrency) {
    if (row.currency === c.baseCurrency) {
      totalMinor += row.totalMinor;
      continue;
    }
    const { data: rate } = await c.supabase.rpc("fx_at", {
      _from: row.currency,
      _to: c.baseCurrency,
      _date: today,
    });
    if (typeof rate === "number") {
      totalMinor += Math.round(row.totalMinor * rate);
    } else {
      // fallback: agregat ca RON la rata 1:1
      totalMinor += row.totalMinor;
    }
  }

  return { totalMinor, currency: c.baseCurrency, byCurrency };
}

// ---------- Monthly KPIs --------------------------------------------------
export type MonthlyKpi = {
  income: number;
  expense: number;
  saved: number;
};

export async function getMonthlyKpis(
  c: DashboardContext,
  monthIso: string,
): Promise<MonthlyKpi> {
  const monthStart = monthIso;
  const ms = new Date(monthIso + "T00:00:00");
  const me = new Date(ms);
  me.setMonth(me.getMonth() + 1);
  me.setDate(0);
  const monthEnd = me.toISOString().slice(0, 10);

  const { data } = await c.supabase
    .from("transactions")
    .select("amount, base_amount, currency, status, is_transfer")
    .gte("occurred_on", monthStart)
    .lte("occurred_on", monthEnd)
    .eq("is_transfer", false)
    .neq("status", "void");

  let income = 0;
  let expense = 0;
  for (const t of data ?? []) {
    const v = t.base_amount ?? t.amount;
    if (v > 0) income += v;
    else expense += -v;
  }
  return { income, expense, saved: income - expense };
}

// ---------- Recent transactions ------------------------------------------
type TxRow = Database["public"]["Tables"]["transactions"]["Row"];

export async function getRecentTransactions(
  c: DashboardContext,
  limit = 5,
): Promise<TxRow[]> {
  const { data } = await c.supabase
    .from("transactions")
    .select("*")
    .neq("status", "void")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as TxRow[];
}

// ---------- Upcoming bills -----------------------------------------------
type RecurringRow =
  Database["public"]["Tables"]["recurring_transactions"]["Row"];

export async function getUpcomingBills(
  c: DashboardContext,
  days = 7,
): Promise<RecurringRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const { data } = await c.supabase
    .from("recurring_transactions")
    .select("*")
    .eq("is_active", true)
    .gte("next_date", today)
    .lte("next_date", cutoffIso)
    .order("next_date", { ascending: true });
  return (data ?? []) as RecurringRow[];
}

// ---------- Daily spending (calendar heatmap) -----------------------------
export type DailySpend = {
  date: string; // YYYY-MM-DD
  amount: number; // minor units, expenses absolute
  count: number;
};

export async function getDailySpending(
  c: DashboardContext,
  days = 84,
): Promise<DailySpend[]> {
  const start = new Date();
  start.setDate(start.getDate() - days);
  const startIso = start.toISOString().slice(0, 10);

  const { data } = await c.supabase
    .from("transactions")
    .select("occurred_on, amount, base_amount, currency, is_transfer, status")
    .gte("occurred_on", startIso)
    .eq("is_transfer", false)
    .neq("status", "void");

  const byDate = new Map<string, { amount: number; count: number }>();
  for (const t of data ?? []) {
    const v = t.base_amount ?? t.amount;
    if (v >= 0) continue; // doar cheltuieli
    const key = t.occurred_on;
    const cur = byDate.get(key) ?? { amount: 0, count: 0 };
    cur.amount += -v;
    cur.count += 1;
    byDate.set(key, cur);
  }
  return Array.from(byDate.entries())
    .map(([date, v]) => ({ date, amount: v.amount, count: v.count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- Sankey data ---------------------------------------------------
export type SankeyData = {
  nodes: Array<{ id: string; nodeColor?: string }>;
  links: Array<{ source: string; target: string; value: number }>;
};

export async function getSankeyData(
  c: DashboardContext,
  monthIso: string,
): Promise<SankeyData> {
  const monthStart = monthIso;
  const ms = new Date(monthIso + "T00:00:00");
  const me = new Date(ms);
  me.setMonth(me.getMonth() + 1);
  me.setDate(0);
  const monthEnd = me.toISOString().slice(0, 10);

  // Cashflow agregează income + expense per categorie.
  const { data: cashflow } = await c.supabase.rpc("cashflow", {
    _hh: c.householdId,
    _from: monthStart,
    _to: monthEnd,
  });

  if (!cashflow || cashflow.length === 0) {
    return { nodes: [], links: [] };
  }

  const HUB = "Net Income";
  const incomeRows = cashflow.filter((r) => r.income > 0);
  const expenseRows = cashflow
    .filter((r) => r.expense > 0)
    .sort((a, b) => b.expense - a.expense);

  // Top 8 expense categories, rest grouped as "Altele".
  const top = expenseRows.slice(0, 8);
  const rest = expenseRows.slice(8);
  const restTotal = rest.reduce((s, r) => s + r.expense, 0);

  const nodes: SankeyData["nodes"] = [];
  const links: SankeyData["links"] = [];
  const seen = new Set<string>();

  function addNode(id: string) {
    if (!seen.has(id)) {
      nodes.push({ id });
      seen.add(id);
    }
  }

  addNode(HUB);
  for (const row of incomeRows) {
    const id = row.category;
    addNode(id);
    links.push({ source: id, target: HUB, value: row.income });
  }
  for (const row of top) {
    const id = row.category;
    addNode(id);
    links.push({ source: HUB, target: id, value: row.expense });
  }
  if (restTotal > 0) {
    addNode("Altele");
    links.push({ source: HUB, target: "Altele", value: restTotal });
  }

  return { nodes, links };
}

// ---------- Net-worth history (sparkline) ---------------------------------
export type NetWorthPoint = {
  month: string; // YYYY-MM-01
  totalMinor: number;
};

/**
 * Aproximează net worth-ul în luniile precedente prin „walking back" prin
 * tranzacții — `current_balance` minus suma tranzacțiilor de după acea
 * lună. Nu e perfect (nu surprinde adjustment-uri externe), dar e
 * suficient pentru sparkline.
 */
export async function getNetWorthHistory(
  c: DashboardContext,
  months = 6,
): Promise<NetWorthPoint[]> {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);

  const { data: tx } = await c.supabase
    .from("transactions")
    .select("occurred_on, amount, base_amount, currency, is_transfer, status")
    .gte("occurred_on", start.toISOString().slice(0, 10))
    .neq("status", "void")
    .eq("is_transfer", false);

  // Net worth curent (toate currencies, în baseCurrency).
  const current = await getNetWorth(c);

  const points: NetWorthPoint[] = [];
  // Pentru fiecare lună înapoi, ne rotim suma tranzacțiilor după acea
  // lună (le „revertăm").
  for (let i = months - 1; i >= 0; i--) {
    const m = new Date(now);
    m.setMonth(m.getMonth() - i);
    m.setDate(1);
    const monthStartIso = m.toISOString().slice(0, 10);

    let total = current.totalMinor;
    for (const t of tx ?? []) {
      if (t.occurred_on >= monthStartIso) {
        const v = t.base_amount ?? t.amount;
        total -= v;
      }
    }
    points.push({ month: monthStartIso, totalMinor: total });
  }
  // Punctul final = current.
  points[points.length - 1] = {
    month: points[points.length - 1]!.month,
    totalMinor: current.totalMinor,
  };
  return points;
}

// ---------- Income vs Expense by month -----------------------------------
export type MonthBar = {
  month: string;
  income: number;
  expense: number;
};

export async function getIncomeVsExpense(
  c: DashboardContext,
  months = 12,
): Promise<MonthBar[]> {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);

  const { data } = await c.supabase
    .from("transactions")
    .select("occurred_on, amount, base_amount, currency, is_transfer, status")
    .gte("occurred_on", start.toISOString().slice(0, 10))
    .neq("status", "void")
    .eq("is_transfer", false);

  const byMonth = new Map<string, { income: number; expense: number }>();
  for (const t of data ?? []) {
    const monthKey = t.occurred_on.slice(0, 7) + "-01";
    const cur = byMonth.get(monthKey) ?? { income: 0, expense: 0 };
    const v = t.base_amount ?? t.amount;
    if (v > 0) cur.income += v;
    else cur.expense += -v;
    byMonth.set(monthKey, cur);
  }
  // Asigurăm că toate luniile sunt prezente (chiar dacă fără tranzacții).
  const out: MonthBar[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const m = new Date(now);
    m.setMonth(m.getMonth() - i);
    m.setDate(1);
    const key = m.toISOString().slice(0, 10);
    const cur = byMonth.get(key) ?? { income: 0, expense: 0 };
    out.push({ month: key, ...cur });
  }
  return out;
}

// ---------- Treemap categories --------------------------------------------
export type TreemapNode = {
  name: string;
  value: number;
  color?: string;
};

export async function getCategoryTreemap(
  c: DashboardContext,
  monthIso: string,
): Promise<TreemapNode[]> {
  const ms = new Date(monthIso + "T00:00:00");
  const me = new Date(ms);
  me.setMonth(me.getMonth() + 1);
  me.setDate(0);

  const { data } = await c.supabase.rpc("cashflow", {
    _hh: c.householdId,
    _from: monthIso,
    _to: me.toISOString().slice(0, 10),
  });

  return (data ?? [])
    .filter((r) => r.expense > 0)
    .map((r) => ({ name: r.category, value: r.expense }))
    .sort((a, b) => b.value - a.value);
}
