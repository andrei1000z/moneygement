import "server-only";

import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { startAuth } from "@/lib/enable-banking/client";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  institution_id: z.string().min(2).max(64),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`banking-auth:${user.id}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 },
    );
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) {
    return NextResponse.json(
      { error: "Niciun household activ" },
      { status: 400 },
    );
  }

  const state = randomBytes(16).toString("hex");
  const origin = new URL(req.url).origin;
  const redirectUrl = `${origin}/api/banking/callback`;

  // Insert pre-record bank_connection cu status pending. Folosim state
  // ca un correlation key — îl regăsim la callback.
  const { data: connection, error: dbErr } = await supabase
    .from("bank_connections")
    .insert({
      household_id: profile.active_household,
      user_id: user.id,
      provider: "enable_banking",
      institution_id: body.institution_id,
      institution_name: body.institution_id,
      requisition_id: state, // reuse field as correlation key
      status: "pending",
    })
    .select("id")
    .single();
  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  try {
    const auth = await startAuth({
      institution_id: body.institution_id,
      redirect_url: redirectUrl,
      state,
    });
    return NextResponse.json({
      ok: true,
      url: auth.url,
      connection_id: connection.id,
    });
  } catch (e) {
    // Curățăm rândul pre-creat dacă API-ul a refuzat.
    await supabase.from("bank_connections").delete().eq("id", connection.id);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "auth_failed" },
      { status: 502 },
    );
  }
}
