"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type BudgetRow = Database["public"]["Tables"]["budgets"]["Row"];

export type BudgetProgressRow = {
  category_id: string;
  budget_amount: number;
  rollover: boolean;
  spent: number;
  rollover_in: number;
  available: number;
};

export function useBudgets(month: string) {
  return useQuery({
    queryKey: ["budgets", month],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("month", month);
      if (error) throw error;
      return (data ?? []) as BudgetRow[];
    },
    staleTime: 30_000,
  });
}

export function useBudgetProgress(month: string) {
  return useQuery({
    queryKey: ["budget-progress", month],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [] as BudgetProgressRow[];
      const { data: profile } = await supabase
        .from("profiles")
        .select("active_household")
        .eq("id", user.id)
        .single();
      if (!profile?.active_household) return [] as BudgetProgressRow[];

      const { data, error } = await supabase.rpc("budget_progress", {
        _hh: profile.active_household,
        _month: month,
      });
      if (error) throw error;
      return (data ?? []) as BudgetProgressRow[];
    },
    staleTime: 30_000,
  });
}

export function useMonthIncome(month: string) {
  return useQuery({
    queryKey: ["month-income", month],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return 0;
      const { data: profile } = await supabase
        .from("profiles")
        .select("active_household")
        .eq("id", user.id)
        .single();
      if (!profile?.active_household) return 0;
      const { data, error } = await supabase.rpc("month_income", {
        _hh: profile.active_household,
        _month: month,
      });
      if (error) throw error;
      return (data ?? 0) as number;
    },
    staleTime: 30_000,
  });
}

export function useInvalidateBudgets() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["budgets"] });
    qc.invalidateQueries({ queryKey: ["budget-progress"] });
    qc.invalidateQueries({ queryKey: ["month-income"] });
  };
}
