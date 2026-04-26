import "server-only";

import { NextResponse } from "next/server";

import { createSession, getAccounts } from "@/lib/enable-banking/client";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Callback handler invocat de banca după SCA. Primește `state` (correlation
 * key) și `code` (authorization code).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");

  if (!state || !code) {
    return NextResponse.redirect(`${url.origin}/connections?error=missing_params`);
  }

  const supabase = createAdminClient();
  const { data: connection } = await supabase
    .from("bank_connections")
    .select("id, household_id, user_id")
    .eq("requisition_id", state)
    .single();

  if (!connection) {
    return NextResponse.redirect(
      `${url.origin}/connections?error=connection_not_found`,
    );
  }

  try {
    const session = await createSession(code);

    const expiresAt = new Date(Date.now() + 180 * 86400 * 1000).toISOString();
    await supabase
      .from("bank_connections")
      .update({
        requisition_id: session.session_id,
        status: "active",
        expires_at: expiresAt,
      })
      .eq("id", connection.id);

    // Auto-importă conturile la prima conectare.
    try {
      const accountsRes = await getAccounts(session.session_id);
      for (const acc of accountsRes.accounts) {
        await supabase.from("accounts").insert({
          household_id: connection.household_id,
          owner_id: connection.user_id,
          name: acc.name ?? acc.product ?? `Cont ${acc.iban?.slice(-4) ?? "—"}`,
          type: "checking",
          currency: acc.currency,
          bank_name: acc.product ?? null,
          iban_last4: acc.iban?.slice(-4) ?? null,
          initial_balance: 0,
          current_balance: 0,
        });
      }
    } catch {
      // Best-effort — userul poate adăuga manual contul ulterior.
    }

    return NextResponse.redirect(
      `${url.origin}/connections?connected=${connection.id}`,
    );
  } catch (e) {
    await supabase
      .from("bank_connections")
      .update({ status: "error" })
      .eq("id", connection.id);
    return NextResponse.redirect(
      `${url.origin}/connections?error=${encodeURIComponent(
        e instanceof Error ? e.message : "session_failed",
      )}`,
    );
  }
}
