import "server-only";

import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { expectedOrigins, rpId } from "@/lib/webauthn/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  response: RegistrationResponseJSON;
  device_name?: string;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const expectedChallenge = body.response.response.clientDataJSON
    ? extractChallenge(body.response.response.clientDataJSON)
    : null;
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Missing challenge" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: stored } = await admin
    .from("webauthn_challenges")
    .select("id, challenge, user_id, expires_at, consumed_at")
    .eq("challenge", expectedChallenge)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!stored || stored.consumed_at || new Date(stored.expires_at) < new Date()) {
    return NextResponse.json({ error: "Challenge invalid sau expirat" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: stored.challenge,
      expectedOrigin: expectedOrigins(),
      expectedRPID: rpId(),
      requireUserVerification: false,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Verificare eșuată" },
      { status: 400 },
    );
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Înregistrare eșuată" }, { status: 400 });
  }

  const { credential, credentialDeviceType } = verification.registrationInfo;

  // Salvăm credential-ul.
  const { error: insertErr } = await admin.from("webauthn_credentials").insert({
    user_id: user.id,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey),
    counter: credential.counter,
    device_name:
      body.device_name?.slice(0, 80) ??
      (credentialDeviceType === "multiDevice" ? "Passkey sincronizat" : "Acest dispozitiv"),
    transports: (credential.transports ?? []) as string[],
  });
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Mark challenge consumed.
  await admin
    .from("webauthn_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", stored.id);

  return NextResponse.json({ ok: true });
}

function extractChallenge(clientDataJSON: string): string | null {
  try {
    const buf = Buffer.from(clientDataJSON, "base64url");
    const data = JSON.parse(buf.toString("utf8")) as { challenge: string };
    return data.challenge;
  } catch {
    return null;
  }
}
