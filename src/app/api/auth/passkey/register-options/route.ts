import "server-only";

import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rpId, rpName } from "@/lib/webauthn/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  // Pentru ca utilizatorul să nu duplice un passkey deja înregistrat pe
  // același device, includem credentials existente în excludeCredentials.
  const { data: existing } = await supabase
    .from("webauthn_credentials")
    .select("credential_id, transports")
    .eq("user_id", user.id);

  const options = await generateRegistrationOptions({
    rpName: rpName(),
    rpID: rpId(),
    userID: new TextEncoder().encode(user.id),
    userName: user.email ?? user.id,
    userDisplayName: (user.user_metadata?.full_name as string) ?? user.email ?? "Utilizator",
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((c) => ({
      id: c.credential_id,
      transports: (c.transports ?? []) as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: undefined,
    },
  });

  // Salvăm challenge-ul în DB (TTL 5 min) pentru a-l verifica la /register-verify.
  const admin = createAdminClient();
  await admin.from("webauthn_challenges").insert({
    challenge: options.challenge,
    user_id: user.id,
  });

  return NextResponse.json(options);
}
