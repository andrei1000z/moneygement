import "server-only";

import { NextResponse } from "next/server";

import { withPat } from "@/lib/pat/handler";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withPat(async (_req, ctx) => {
  const supabase = createAdminClient();
  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id, name, type, currency, current_balance, is_active, archived_at")
    .eq("household_id", ctx.householdId)
    .is("archived_at", null);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totals = new Map<string, number>();
  for (const a of accounts ?? []) {
    totals.set(
      a.currency,
      (totals.get(a.currency) ?? 0) + Number(a.current_balance ?? 0),
    );
  }

  return NextResponse.json({
    accounts: (accounts ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      currency: a.currency,
      balance_minor: Number(a.current_balance ?? 0),
    })),
    totals_by_currency: Object.fromEntries(totals),
  });
});
