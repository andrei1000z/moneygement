import "server-only";

import { NextResponse } from "next/server";

import { createTransaction } from "@/app/(dashboard)/transactions/actions";
import type { TransactionInput } from "@/lib/validation/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint pentru re-trimiterea unei tranzacții care a fost creată
 * offline (din IndexedDB). Folosește exact același server action ca
 * UI-ul online; `createTransaction` aplică validation + RLS.
 */
export async function POST(req: Request) {
  let payload: TransactionInput;
  try {
    payload = (await req.json()) as TransactionInput;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const result = await createTransaction(payload);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: result.data.id });
}
