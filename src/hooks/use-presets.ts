"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type PresetRow =
  Database["public"]["Tables"]["quick_add_presets"]["Row"];

export function usePresets() {
  return useQuery({
    queryKey: ["presets"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("quick_add_presets")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PresetRow[];
    },
    staleTime: 60_000,
  });
}

export function useInvalidatePresets() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["presets"] });
}
