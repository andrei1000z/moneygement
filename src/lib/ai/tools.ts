import "server-only";

import { tool } from "ai";
import { z } from "zod";

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
  };
}

export type AiTools = ReturnType<typeof buildAiTools>;
