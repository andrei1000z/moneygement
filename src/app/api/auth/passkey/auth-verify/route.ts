import "server-only";

import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { expectedOrigins, rpId } from "@/lib/webauthn/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  response: AuthenticationResponseJSON;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const challenge = extractChallenge(body.response.response.clientDataJSON);
  if (!challenge) {
    return NextResponse.json({ error: "Missing challenge" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: stored } = await admin
    .from("webauthn_challenges")
    .select("id, challenge, user_id, email, expires_at, consumed_at")
    .eq("challenge", challenge)
    .maybeSingle();
  if (!stored || stored.consumed_at || new Date(stored.expires_at) < new Date()) {
    return NextResponse.json({ error: "Challenge invalid sau expirat" }, { status: 400 });
  }

  // Caută credential-ul după credential_id-ul din response.
  const credentialId = body.response.id;
  const { data: cred } = await admin
    .from("webauthn_credentials")
    .select("id, user_id, public_key, counter, transports")
    .eq("credential_id", credentialId)
    .maybeSingle();
  if (!cred) {
    return NextResponse.json({ error: "Passkey necunoscut" }, { status: 400 });
  }

  // Dacă a fost specificat user_id în challenge (email known), verificăm match.
  if (stored.user_id && stored.user_id !== cred.user_id) {
    return NextResponse.json({ error: "Passkey nu match-uiește user-ul" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: stored.challenge,
      expectedOrigin: expectedOrigins(),
      expectedRPID: rpId(),
      requireUserVerification: false,
      credential: {
        id: credentialId,
        publicKey: new Uint8Array(cred.public_key as unknown as ArrayBuffer),
        counter: Number(cred.counter),
        transports: (cred.transports ?? []) as AuthenticatorTransport[],
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Verificare eșuată" },
      { status: 400 },
    );
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Autentificare eșuată" }, { status: 401 });
  }

  // Update counter (anti-replay) + last_used_at.
  await admin
    .from("webauthn_credentials")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", cred.id);

  // Marchez challenge consumat.
  await admin
    .from("webauthn_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", stored.id);

  // Acum generăm o sesiune pentru user. Strategy: admin.generateLink cu
  // type='magiclink', extragem hashed_token și-l returnăm clientului care
  // va apela supabase.auth.verifyOtp({ token_hash, type: 'magiclink' }).
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(
    cred.user_id,
  );
  if (userErr || !userData.user?.email) {
    return NextResponse.json(
      { error: "User not found or no email" },
      { status: 500 },
    );
  }

  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userData.user.email,
  });
  if (linkErr) {
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    token_hash: link.properties.hashed_token,
    type: "magiclink" as const,
    user: { id: userData.user.id, email: userData.user.email },
  });
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
