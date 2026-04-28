import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Format token: `bnii_<32_hex>` — easy de identificat ca aparținând Banii.
 * Generăm 32 bytes random (256 bits entropy), hex-encode.
 */
export function generateToken(): { raw: string; prefix: string; hash: string } {
  const random = randomBytes(32).toString("hex");
  const raw = `bnii_${random}`;
  const prefix = raw.slice(0, 12); // 'bnii_' + 7 hex
  const hash = sha256(raw);
  return { raw, prefix, hash };
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export type PatContext = {
  userId: string;
  householdId: string;
  scopes: string[];
  tokenId: string;
};

/**
 * Validează un PAT din header `Authorization: Bearer bnii_xxx`.
 * Întoarce contextul user-ului sau null dacă invalid/expired/revoked.
 */
export async function authenticatePat(
  authHeader: string | null | undefined,
): Promise<PatContext | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token.startsWith("bnii_") || token.length < 20) return null;

  const hash = sha256(token);
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("pat_tokens")
    .select("id, user_id, household_id, scopes, expires_at, revoked_at")
    .eq("token_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();

  if (!row) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;

  // Best-effort: actualizează last_used_at fără să blochezi cererea.
  admin
    .from("pat_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(() => undefined);

  return {
    userId: row.user_id,
    householdId: row.household_id,
    scopes: (row.scopes ?? []) as string[],
    tokenId: row.id,
  };
}

export function requireScope(ctx: PatContext, scope: "read" | "write"): boolean {
  return ctx.scopes.includes(scope);
}
