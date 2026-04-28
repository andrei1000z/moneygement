import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { withPat } from "@/lib/pat/handler";
import { createAdminClient } from "@/lib/supabase/admin";
import { firstZodMessage } from "@/lib/zod-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const txSchema = z.object({
  account_id: z.string().uuid(),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().int(),
  currency: z.string().length(3),
  payee: z.string().max(200).optional(),
  category_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string()).max(20).optional(),
});

export const POST = withPat(async (req, ctx) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const parsed = txSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodMessage(parsed.error) },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Verifică account-ul aparține household-ului.
  const { data: account } = await supabase
    .from("accounts")
    .select("id, household_id")
    .eq("id", parsed.data.account_id)
    .single();
  if (!account || account.household_id !== ctx.householdId) {
    return NextResponse.json(
      { error: "Account-ul nu aparține household-ului tău" },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      household_id: ctx.householdId,
      user_id: ctx.userId,
      account_id: parsed.data.account_id,
      occurred_on: parsed.data.occurred_on,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      payee: parsed.data.payee ?? null,
      category_id: parsed.data.category_id ?? null,
      notes: parsed.data.notes ?? null,
      tags: parsed.data.tags ?? [],
      source: "manual",
      status: "cleared",
      ownership: "mine",
    })
    .select("id, occurred_on, amount, currency, payee")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, transaction: data });
}, { requireWrite: true });
