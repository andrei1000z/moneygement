"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];

export const accountsKey = (opts?: { archived?: boolean }) =>
  ["accounts", opts?.archived ?? "active"] as const;

export function useAccounts(opts: { archived?: boolean } = {}) {
  return useQuery({
    queryKey: accountsKey(opts),
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from("accounts")
        .select("*")
        .order("type", { ascending: true })
        .order("name", { ascending: true });
      if (opts.archived === false || opts.archived === undefined) {
        q = q.is("archived_at", null);
      } else {
        q = q.not("archived_at", "is", null);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AccountRow[];
    },
    staleTime: 30_000,
  });
}

export function useInvalidateAccounts() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["accounts"] });
}
