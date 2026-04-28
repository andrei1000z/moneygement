import "server-only";

import { NextResponse } from "next/server";

import { withPat } from "@/lib/pat/handler";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withPat(async (req, ctx) => {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 500);
  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");
  const category = url.searchParams.get("category_id");
  const isTransfer = url.searchParams.get("is_transfer");

  const supabase = createAdminClient();
  let q = supabase
    .from("transactions")
    .select(
      "id, occurred_on, amount, currency, payee, notes, category_id, is_transfer, status, ownership, tags, created_at",
    )
    .eq("household_id", ctx.householdId)
    .order("occurred_on", { ascending: false })
    .limit(limit);

  if (fromDate) q = q.gte("occurred_on", fromDate);
  if (toDate) q = q.lte("occurred_on", toDate);
  if (category) q = q.eq("category_id", category);
  if (isTransfer === "true") q = q.eq("is_transfer", true);
  if (isTransfer === "false") q = q.eq("is_transfer", false);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ transactions: data ?? [], count: data?.length ?? 0 });
});
