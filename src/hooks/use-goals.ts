"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type GoalRow = Database["public"]["Tables"]["goals"]["Row"];

export function useGoals(opts: { archived?: boolean } = {}) {
  return useQuery({
    queryKey: ["goals", opts.archived ?? "active"],
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from("goals")
        .select("*")
        .order("created_at", { ascending: false });
      if (opts.archived === false || opts.archived === undefined) {
        q = q.is("archived_at", null);
      } else {
        q = q.not("archived_at", "is", null);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as GoalRow[];
    },
    staleTime: 30_000,
  });
}

export function useInvalidateGoals() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["goals"] });
}
