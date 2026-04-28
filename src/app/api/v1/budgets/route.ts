import "server-only";

import { NextResponse } from "next/server";

import { withPat } from "@/lib/pat/handler";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withPat(async (req, ctx) => {
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? thisMonthIso();

  const supabase = createAdminClient();

  // RPC budget_progress întoarce budget_amount, spent, available, rollover_in.
  const { data: progress, error } = await supabase.rpc("budget_progress", {
    _hh: ctx.householdId,
    _month: month,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    month,
    budgets: (progress ?? []).map((p: Record<string, unknown>) => ({
      category_id: p.category_id,
      category_name: p.category_name,
      budget_amount_minor: Number(p.budget_amount ?? 0),
      spent_minor: Number(p.spent ?? 0),
      available_minor: Number(p.available ?? 0),
      rollover_in_minor: Number(p.rollover_in ?? 0),
    })),
  });
});

function thisMonthIso(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
