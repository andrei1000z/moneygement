import "server-only";

import { NextResponse } from "next/server";

import { withPat } from "@/lib/pat/handler";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withPat(async (_req, ctx) => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("goals")
    .select(
      "id, name, target_amount, current_amount, currency, target_date, kind, archived_at, created_at",
    )
    .eq("household_id", ctx.householdId)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    goals: (data ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      kind: g.kind,
      target_minor: Number(g.target_amount),
      current_minor: Number(g.current_amount),
      currency: g.currency,
      target_date: g.target_date,
      progress_pct:
        Number(g.target_amount) > 0
          ? Math.min(1, Number(g.current_amount) / Number(g.target_amount))
          : 0,
      archived: !!g.archived_at,
    })),
  });
});
