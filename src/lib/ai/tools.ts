import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { projectFire } from "@/lib/fire/projection";
import type { createClient } from "@/lib/supabase/server";

import { generateEmbedding, toPgVector } from "./embeddings";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

type ToolContext = {
  supabase: SupabaseServer;
  householdId: string;
  userId: string;
};

/**
 * Construiește tool-urile cu context (supabase + household). Toate
 * tool-urile întorc date scoped la household-ul curent — RLS validează
 * la nivel de DB ca double-check.
 */
export function buildAiTools(ctx: ToolContext) {
  return {
    query_transactions: tool({
      description:
        "Caută tranzacții cu filtre. Folosește pentru întrebări despre cheltuieli, venituri, sau o lună/săptămână anume. Returnează maxim 50 rânduri.",
      inputSchema: z.object({
        from: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Dată inclusivă YYYY-MM-DD"),
        to: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Dată inclusivă YYYY-MM-DD"),
        category_id: z.string().uuid().optional(),
        merchant: z
          .string()
          .optional()
          .describe("Caută după payee sau notes (ILIKE)"),
        min_amount: z
          .number()
          .optional()
          .describe("Suma minimă absolută în BANI (1 RON = 100)"),
        max_amount: z.number().optional(),
        type: z
          .enum(["income", "expense", "transfer", "any"])
          .optional()
          .default("any"),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async (args) => {
        let q = ctx.supabase
          .from("transactions")
          .select(
            "id, occurred_on, amount, currency, payee, category_id, is_transfer",
          )
          .eq("household_id", ctx.householdId)
          .gte("occurred_on", args.from)
          .lte("occurred_on", args.to)
          .order("occurred_on", { ascending: false })
          .limit(args.limit);

        if (args.category_id) q = q.eq("category_id", args.category_id);
        if (args.merchant)
          q = q.or(
            `payee.ilike.%${args.merchant}%,notes.ilike.%${args.merchant}%`,
          );
        if (args.min_amount != null) q = q.gte("amount", args.min_amount);
        if (args.max_amount != null) q = q.lte("amount", args.max_amount);

        if (args.type === "income") q = q.gt("amount", 0);
        else if (args.type === "expense") q = q.lt("amount", 0);
        if (args.type === "transfer") q = q.eq("is_transfer", true);
        else if (args.type !== "any") q = q.eq("is_transfer", false);

        const { data, error } = await q;
        if (error) return { error: error.message };
        return {
          count: data?.length ?? 0,
          transactions: data ?? [],
        };
      },
    }),

    get_budget: tool({
      description:
        "Întoarce progresul bugetelor pentru o lună (YYYY-MM-01). Pentru fiecare categorie: assigned, spent, available, rollover.",
      inputSchema: z.object({
        month: z
          .string()
          .regex(/^\d{4}-\d{2}-01$/)
          .describe("Prima zi a lunii, ex: 2026-04-01"),
      }),
      execute: async (args) => {
        const { data, error } = await ctx.supabase.rpc("budget_progress", {
          _hh: ctx.householdId,
          _month: args.month,
        });
        if (error) return { error: error.message };
        return { month: args.month, categories: data ?? [] };
      },
    }),

    get_net_worth: tool({
      description:
        "Întoarce patrimoniul curent ca sumă a balanței conturilor non-arhivate.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data, error } = await ctx.supabase
          .from("accounts")
          .select("name, type, currency, current_balance")
          .eq("household_id", ctx.householdId)
          .is("archived_at", null);
        if (error) return { error: error.message };

        const total = (data ?? []).reduce(
          (acc, a) => acc + Number(a.current_balance ?? 0),
          0,
        );
        return {
          total_minor: total,
          accounts: data ?? [],
        };
      },
    }),

    get_goal_progress: tool({
      description:
        "Listează obiectivele active (nearchivate) cu progres (current/target). Folosește pentru întrebări despre cât a strâns la X.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data, error } = await ctx.supabase
          .from("goals")
          .select(
            "id, name, bucket_type, target_amount, current_amount, target_date, currency, archived_at",
          )
          .eq("household_id", ctx.householdId)
          .is("archived_at", null);
        if (error) return { error: error.message };
        return { goals: data ?? [] };
      },
    }),

    simulate_scenario: tool({
      description:
        "Simulează compound interest deterministic. Folosește pentru 'dacă pun X lei lunar Y ani la Z%, cât am la final?'. Calcul matematic exact, fără LLM.",
      inputSchema: z.object({
        initial: z.number().describe("Suma inițială în unități minore"),
        monthly_contribution: z
          .number()
          .default(0)
          .describe("Contribuție lunară în unități minore"),
        annual_rate: z
          .number()
          .min(-1)
          .max(2)
          .describe("Randament anual ca fracție (0.05 = 5%)"),
        months: z.number().int().min(1).max(600),
      }),
      execute: async (args) => {
        const r = args.annual_rate / 12;
        let balance = args.initial;
        const trajectory: Array<{ month: number; balance: number }> = [];
        for (let m = 1; m <= args.months; m++) {
          balance = balance * (1 + r) + args.monthly_contribution;
          if (m % 12 === 0 || m === args.months || m === 1)
            trajectory.push({ month: m, balance: Math.round(balance) });
        }
        return {
          final_balance_minor: Math.round(balance),
          total_contributions: Math.round(
            args.initial + args.monthly_contribution * args.months,
          ),
          interest_earned: Math.round(
            balance - args.initial - args.monthly_contribution * args.months,
          ),
          trajectory,
        };
      },
    }),

    semantic_search: tool({
      description:
        "Caută semantic în tranzacțiile gospodăriei. Folosește pentru întrebări vagi: 'ce cheltuieli stranii am avut'. Returnează top 10 vecini.",
      inputSchema: z.object({
        query: z.string().min(2).max(500),
      }),
      execute: async (args) => {
        try {
          const embedding = await generateEmbedding(args.query);
          const { data, error } = await ctx.supabase.rpc("match_transactions", {
            _household: ctx.householdId,
            _query_embedding: toPgVector(embedding),
            _limit: 10,
          });
          if (error) return { error: error.message };
          return { transactions: data ?? [] };
        } catch (e) {
          return {
            error:
              e instanceof Error ? e.message : "Embedding indisponibil",
          };
        }
      },
    }),

    update_transaction_category: tool({
      description:
        "Schimbă categoria unei tranzacții. Folosește DOAR după ce userul confirmă explicit.",
      inputSchema: z.object({
        transaction_id: z.string().uuid(),
        category_id: z.string().uuid().nullable(),
      }),
      execute: async (args) => {
        const { error } = await ctx.supabase
          .from("transactions")
          .update({ category_id: args.category_id })
          .eq("id", args.transaction_id)
          .eq("household_id", ctx.householdId);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },
    }),

    fire_project: tool({
      description:
        "Calculează FIRE (Financial Independence Retire Early): Lean / Coast / Full FIRE pentru gospodărie. Folosește net worth-ul actual + cheltuielile ultimele 12 luni dacă userul nu specifică. Toate sumele în unități minore (RON minor = bani).",
      inputSchema: z.object({
        net_worth_minor: z.number().int().nonnegative().optional(),
        annual_expenses_minor: z.number().int().nonnegative().optional(),
        monthly_contribution_minor: z.number().int().nonnegative().default(300000),
        expected_return: z.number().min(0).max(0.5).default(0.07),
        inflation_rate: z.number().min(0).max(0.3).default(0.06),
        current_age: z.number().int().min(18).max(80).default(30),
        target_age: z.number().int().min(25).max(80).default(50),
        adjust_for_inflation: z.boolean().default(true),
      }),
      execute: async (args) => {
        // Auto-fill net_worth + annual_expenses dacă nu specificate.
        let netWorth = args.net_worth_minor;
        let annualExpenses = args.annual_expenses_minor;

        if (netWorth === undefined) {
          const { data: accounts } = await ctx.supabase
            .from("accounts")
            .select("current_balance, currency")
            .eq("household_id", ctx.householdId)
            .is("archived_at", null);
          const ronAccounts = (accounts ?? []).filter((a) => a.currency === "RON");
          netWorth = ronAccounts.reduce(
            (acc, a) => acc + Number(a.current_balance ?? 0),
            0,
          );
        }
        if (annualExpenses === undefined) {
          const yearAgo = new Date();
          yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);
          const { data: txs } = await ctx.supabase
            .from("transactions")
            .select("base_amount, amount")
            .eq("household_id", ctx.householdId)
            .eq("is_transfer", false)
            .lt("amount", 0)
            .gte("occurred_on", yearAgo.toISOString().slice(0, 10));
          annualExpenses = (txs ?? []).reduce(
            (acc, t) => acc + Math.abs(Number(t.base_amount ?? t.amount)),
            0,
          );
        }

        const result = projectFire({
          net_worth_minor: netWorth,
          annual_expenses_minor: annualExpenses,
          monthly_contribution_minor: args.monthly_contribution_minor,
          expected_return: args.expected_return,
          inflation_rate: args.inflation_rate,
          current_age: args.current_age,
          target_age: args.target_age,
          adjust_for_inflation: args.adjust_for_inflation,
        });
        return {
          inputs: {
            net_worth_minor: netWorth,
            annual_expenses_minor: annualExpenses,
            monthly_contribution_minor: args.monthly_contribution_minor,
            expected_return: args.expected_return,
            adjust_for_inflation: args.adjust_for_inflation,
          },
          lean_target_minor: result.lean_target_minor,
          full_target_minor: result.full_target_minor,
          coast_target_minor: result.coast_target_minor,
          years_to_lean: result.years_to_lean,
          years_to_full: result.years_to_full,
          lean_eta_year: result.lean_eta_year,
          full_eta_year: result.full_eta_year,
          effective_return: result.effective_return,
        };
      },
    }),

    get_trips: tool({
      description:
        "Listă călătorii (active + arhivate). Pentru fiecare, calculează spent_minor (sum tranzacții taggate cu trip_<slug>) și progresul vs buget.",
      inputSchema: z.object({
        include_archived: z.boolean().default(false),
      }),
      execute: async (args) => {
        let q = ctx.supabase
          .from("trips")
          .select("id, name, started_on, ended_on, country_code, base_currency, budget_minor, tag")
          .eq("household_id", ctx.householdId)
          .order("started_on", { ascending: false });
        if (!args.include_archived) {
          q = q.is("archived_at", null);
        }
        const { data: trips, error } = await q;
        if (error) return { error: error.message };

        const enriched = await Promise.all(
          (trips ?? []).map(async (t) => {
            const { data: txs } = await ctx.supabase
              .from("transactions")
              .select("amount, base_amount")
              .eq("household_id", ctx.householdId)
              .contains("tags", [t.tag])
              .lt("amount", 0);
            const spent = (txs ?? []).reduce(
              (acc, x) => acc + Math.abs(Number(x.base_amount ?? x.amount)),
              0,
            );
            return {
              id: t.id,
              name: t.name,
              tag: t.tag,
              country_code: t.country_code,
              started_on: t.started_on,
              ended_on: t.ended_on,
              budget_minor: t.budget_minor ? Number(t.budget_minor) : null,
              spent_minor: spent,
              currency: t.base_currency,
              tx_count: txs?.length ?? 0,
              over_budget: t.budget_minor
                ? spent > Number(t.budget_minor)
                : false,
            };
          }),
        );

        return { trips: enriched, count: enriched.length };
      },
    }),

    get_eur_obligations: tool({
      description:
        "Listă obligații recurente în EUR (chirie, asigurări) cu impact FX la cursul BNR curent. Util pentru întrebări despre 'cât plătesc lunar în EUR' sau 'cât m-a costat FX-ul vs anul trecut'.",
      inputSchema: z.object({}),
      execute: async () => {
        const [{ data: obligations }, { data: latestRate }, { data: yearAgoRate }] =
          await Promise.all([
            ctx.supabase
              .from("eur_obligations")
              .select("id, label, amount_eur, day_of_month, is_active, notes")
              .eq("household_id", ctx.householdId)
              .eq("is_active", true)
              .order("day_of_month", { ascending: true }),
            ctx.supabase
              .from("exchange_rates")
              .select("rate, rate_date")
              .eq("base", "EUR")
              .eq("quote", "RON")
              .order("rate_date", { ascending: false })
              .limit(1)
              .maybeSingle(),
            (async () => {
              const yearAgo = new Date();
              yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);
              return ctx.supabase
                .from("exchange_rates")
                .select("rate, rate_date")
                .eq("base", "EUR")
                .eq("quote", "RON")
                .lte("rate_date", yearAgo.toISOString().slice(0, 10))
                .order("rate_date", { ascending: false })
                .limit(1)
                .maybeSingle();
            })(),
          ]);

        const rateNow = latestRate?.rate ? Number(latestRate.rate) : null;
        const rateYearAgo = yearAgoRate?.rate ? Number(yearAgoRate.rate) : null;

        const items = (obligations ?? []).map((o) => {
          const amountEur = Number(o.amount_eur);
          return {
            id: o.id,
            label: o.label,
            amount_eur_minor: amountEur,
            day_of_month: o.day_of_month,
            ron_now_minor: rateNow
              ? Math.round((amountEur * rateNow) / 100) * 100
              : null,
            ron_year_ago_minor: rateYearAgo
              ? Math.round((amountEur * rateYearAgo) / 100) * 100
              : null,
          };
        });

        const totalEur = items.reduce((acc, i) => acc + i.amount_eur_minor, 0);
        const totalRonNow =
          rateNow ? Math.round((totalEur * rateNow) / 100) * 100 : null;
        const totalRonYearAgo =
          rateYearAgo ? Math.round((totalEur * rateYearAgo) / 100) * 100 : null;

        return {
          obligations: items,
          total_eur_minor: totalEur,
          total_ron_now_minor: totalRonNow,
          total_ron_year_ago_minor: totalRonYearAgo,
          fx_delta_minor:
            totalRonNow != null && totalRonYearAgo != null
              ? totalRonNow - totalRonYearAgo
              : null,
          rate_eur_ron_now: rateNow,
          rate_eur_ron_year_ago: rateYearAgo,
        };
      },
    }),
  };
}

export type AiTools = ReturnType<typeof buildAiTools>;
