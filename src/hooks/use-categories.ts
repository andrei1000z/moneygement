"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database, CategoryType } from "@/types/database";

export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export const categoriesKey = (opts?: { type?: CategoryType }) =>
  ["categories", opts?.type ?? "all"] as const;

export function useCategories(opts: { type?: CategoryType } = {}) {
  return useQuery({
    queryKey: categoriesKey(opts),
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from("categories")
        .select("*")
        .is("archived_at", null)
        .order("type", { ascending: true })
        .order("name", { ascending: true });
      if (opts.type) {
        q = q.eq("type", opts.type);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
    staleTime: 60_000,
  });
}

export function useInvalidateCategories() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["categories"] });
}
