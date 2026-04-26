"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type MerchantRow = Database["public"]["Tables"]["merchants"]["Row"];

export const merchantsKey = (search?: string) =>
  ["merchants", (search ?? "").trim().toLowerCase()] as const;

export function useMerchants(opts: { search?: string } = {}) {
  const search = opts.search?.trim() ?? "";
  return useQuery({
    queryKey: merchantsKey(search),
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from("merchants")
        .select("*")
        .order("name", { ascending: true })
        .limit(100);
      if (search.length > 0) {
        // pg_trgm: % e operatorul "similar to". Pentru ILIKE e suficient
        // ca first-pass filter; refining cu rank-ul trgm vine în Faza 4.
        q = q.ilike("name", `%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MerchantRow[];
    },
    staleTime: 30_000,
  });
}

export function useInvalidateMerchants() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["merchants"] });
}
