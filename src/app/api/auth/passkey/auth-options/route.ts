import "server-only";

import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { rpId } from "@/lib/webauthn/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { email?: string };

async function findUserIdByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string | null> {
  const lower = email.trim().toLowerCase();
  // Pagină prin admin.listUsers până găsim sau epuizăm.
  let page = 1;
  for (let i = 0; i < 10; i++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) return null;
    const found = data.users.find((u) => u.email?.toLowerCase() === lower);
    if (found) return found.id;
    if (data.users.length < 200) return null;
    page++;
  }
  return null;
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    // empty body OK pentru passkey discoverable (resident credential).
  }

  const admin = createAdminClient();

  let allowCredentials: Array<{ id: string; transports?: AuthenticatorTransport[] }> = [];
  let userIdForChallenge: string | null = null;
  if (body.email) {
    userIdForChallenge = await findUserIdByEmail(admin, body.email);
    if (userIdForChallenge) {
      const { data: creds } = await admin
        .from("webauthn_credentials")
        .select("credential_id, transports")
        .eq("user_id", userIdForChallenge);
      allowCredentials = (creds ?? []).map((c) => ({
        id: c.credential_id,
        transports: (c.transports ?? []) as AuthenticatorTransport[],
      }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: rpId(),
    allowCredentials,
    userVerification: "preferred",
  });

  await admin.from("webauthn_challenges").insert({
    challenge: options.challenge,
    user_id: userIdForChallenge,
    email: body.email ?? null,
  });

  return NextResponse.json(options);
}
