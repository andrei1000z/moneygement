"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database, Ownership, TxStatus } from "@/types/database";

export type TransactionRow =
  Database["public"]["Tables"]["transactions"]["Row"];

export type TransactionFilters = {
  search?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
  accountIds?: string[];
  categoryIds?: string[];
  amountMin?: number; // minor units
  amountMax?: number;
  tags?: string[];
  status?: TxStatus[];
  ownership?: Ownership[];
  /** Include void / split parents? Default false. */
  includeVoid?: boolean;
};

const PAGE_SIZE = 50;

export const transactionsKey = (filters: TransactionFilters) =>
  ["transactions", filters] as const;

export function useTransactions(filters: TransactionFilters) {
  return useInfiniteQuery({
    queryKey: transactionsKey(filters),
    initialPageParam: 0 as number,
    queryFn: async ({ pageParam }) => {
      const supabase = createClient();
      let q = supabase
        .from("transactions")
        .select("*", { count: "exact" })
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (!filters.includeVoid) q = q.neq("status", "void");
      if (filters.search && filters.search.trim().length > 0) {
        const s = filters.search.trim();
        q = q.or(`payee.ilike.%${s}%,notes.ilike.%${s}%`);
      }
      if (filters.from) q = q.gte("occurred_on", filters.from);
      if (filters.to) q = q.lte("occurred_on", filters.to);
      if (filters.accountIds && filters.accountIds.length > 0) {
        q = q.in("account_id", filters.accountIds);
      }
      if (filters.categoryIds && filters.categoryIds.length > 0) {
        q = q.in("category_id", filters.categoryIds);
      }
      if (filters.amountMin !== undefined) {
        q = q.gte("amount", filters.amountMin);
      }
      if (filters.amountMax !== undefined) {
        q = q.lte("amount", filters.amountMax);
      }
      if (filters.tags && filters.tags.length > 0) {
        q = q.contains("tags", filters.tags);
      }
      if (filters.status && filters.status.length > 0) {
        q = q.in("status", filters.status);
      }
      if (filters.ownership && filters.ownership.length > 0) {
        q = q.in("ownership", filters.ownership);
      }

      const { data, error, count } = await q;
      if (error) throw error;
      return {
        rows: (data ?? []) as TransactionRow[],
        nextOffset:
          (data ?? []).length < PAGE_SIZE ? null : pageParam + PAGE_SIZE,
        total: count ?? 0,
      };
    },
    getNextPageParam: (last) => last.nextOffset,
    staleTime: 15_000,
  });
}

export function useTransaction(id: string | null | undefined) {
  return useQuery({
    queryKey: ["transaction", id],
    enabled: !!id,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as TransactionRow;
    },
  });
}

export function useTransactionComments(transactionId: string | null | undefined) {
  return useQuery({
    queryKey: ["transaction-comments", transactionId],
    enabled: !!transactionId,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tx_comments")
        .select("*")
        .eq("transaction_id", transactionId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTransactionTotals(filters: TransactionFilters) {
  return useQuery({
    queryKey: ["transaction-totals", filters],
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from("transactions")
        .select("amount, currency, base_amount, is_transfer, status")
        .neq("status", "void")
        .eq("is_transfer", false);
      if (filters.from) q = q.gte("occurred_on", filters.from);
      if (filters.to) q = q.lte("occurred_on", filters.to);
      if (filters.accountIds && filters.accountIds.length > 0) {
        q = q.in("account_id", filters.accountIds);
      }
      if (filters.categoryIds && filters.categoryIds.length > 0) {
        q = q.in("category_id", filters.categoryIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      let income = 0;
      let expense = 0;
      for (const row of data ?? []) {
        const amt = row.base_amount ?? row.amount;
        if (amt > 0) income += amt;
        else expense += -amt;
      }
      return { income, expense, net: income - expense };
    },
    staleTime: 15_000,
  });
}

export function useInvalidateTransactions() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["transaction-totals"] });
    qc.invalidateQueries({ queryKey: ["transaction"] });
    qc.invalidateQueries({ queryKey: ["accounts"] });
  };
}

/**
 * Optimistic mutation runner pentru o singură tranzacție.
 * Forma: pasezi mutationFn-ul tău (server action), helper-ul invalidează după.
 */
export function useTxMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<TOutput>,
) {
  const invalidate = useInvalidateTransactions();
  return useMutation({
    mutationFn,
    onSuccess: () => invalidate(),
  });
}
