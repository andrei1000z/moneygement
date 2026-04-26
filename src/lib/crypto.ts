import "server-only";

import { createClient } from "@/lib/supabase/server";

// =====================================================================
// IBAN encryption helpers.
//
// Cheia trăiește în Supabase Vault (vezi 0005_iban_crypto.sql). Funcțiile
// de aici doar pasează plaintext-ul către RPC-urile public.encrypt_iban /
// public.decrypt_iban, care fac criptarea efectivă în DB cu pgcrypto.
//
// Avantaj: cheia nu intră niciodată în mediul Node.js. Apelurile sunt
// legate de RLS (RPC-urile sunt SECURITY DEFINER + grant pe authenticated).
// =====================================================================

/** Întoarce ultimele 4 caractere alfanumerice din IBAN (fără spații). */
export function lastFour(iban: string): string {
  return iban.replace(/\s+/g, "").slice(-4).toUpperCase();
}

/** Curăță IBAN-ul: fără spații, uppercase. */
export function normalizeIBAN(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase();
}

/**
 * Criptează un IBAN și returnează valoarea de stocat în coloana `bytea`.
 * `null` dacă input-ul este gol.
 *
 * Throws dacă cheia din Vault nu e setată — UI-ul ar trebui să prindă
 * eroarea și să arate un mesaj clar.
 */
export async function encryptIBAN(iban: string | null | undefined) {
  if (!iban || iban.trim().length === 0) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("encrypt_iban", {
    iban: normalizeIBAN(iban),
  });
  if (error) throw error;
  // Supabase JS returnează bytea ca string hex prefixat cu \x. Îl pasăm
  // ca atare la insert — driver-ul îl re-convertește la bytea pe server.
  return data as unknown as string | null;
}

/**
 * Decriptează un IBAN. Returnează `null` dacă cheia lipsește din Vault sau
 * dacă valoarea e coruptă — preferăm să nu aruncăm pentru ca lista de
 * conturi să se randeze chiar dacă vault-ul nu e încă configurat.
 */
export async function decryptIBAN(
  encrypted: string | Uint8Array | null | undefined,
) {
  if (!encrypted) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("decrypt_iban", {
    encrypted: encrypted as unknown as string,
  });
  if (error) return null;
  return (data as unknown as string | null) ?? null;
}
