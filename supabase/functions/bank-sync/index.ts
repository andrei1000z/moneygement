// Edge Function bank-sync — invocată la 6 ore de pg_cron.
//
// Pentru fiecare bank_connection cu status='active' și expires_at > now:
//   1. Pentru fiecare cont legat la conexiune (folosim bank_connection_id),
//      apelăm /accounts/{uid}/transactions de la (last_synced_at - 3 zile)
//      la now.
//   2. Mapăm la schema noastră, creăm external_id stabil, INSERT cu
//      onConflict (account_id, external_id) ignoreDuplicates.
//   3. Marchează last_synced_at.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "npm:jose@5";

const BASE_URL = "https://api.enablebanking.com";

let cachedKey: CryptoKey | null = null;

async function pkey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const pem = Deno.env.get("ENABLE_BANKING_PRIVATE_KEY");
  if (!pem) throw new Error("missing ENABLE_BANKING_PRIVATE_KEY");
  cachedKey = await importPKCS8(pem.replace(/\\n/g, "\n"), "RS256");
  return cachedKey;
}

async function jwt() {
  const appId = Deno.env.get("ENABLE_BANKING_APPLICATION_ID")!;
  const kid = Deno.env.get("ENABLE_BANKING_KEY_ID")!;
  const k = await pkey();
  return new SignJWT({ iss: appId })
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid })
    .setIssuedAt()
    .setExpirationTime("60s")
    .setIssuer(appId)
    .sign(k);
}

async function ebFetch<T>(path: string): Promise<T> {
  const t = await jwt();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (!res.ok) {
    throw new Error(`EB ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

function fnv1a(s: string): string {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

Deno.serve(async (req: Request) => {
  const expected = Deno.env.get("CRON_SECRET");
  const auth = req.headers.get("Authorization") ?? "";
  if (!expected || auth.replace(/^Bearer\s+/i, "") !== expected) {
    return new Response("unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const nowIso = new Date().toISOString();
  const { data: connections } = await supabase
    .from("bank_connections")
    .select(
      "id, household_id, user_id, requisition_id, status, expires_at, last_synced_at",
    )
    .eq("status", "active")
    .gt("expires_at", nowIso);

  const summary: Array<{ connection_id: string; status: string }> = [];

  for (const c of connections ?? []) {
    try {
      // Pre-load conturile legate la această conexiune.
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id, name, currency, household_id")
        .eq("household_id", c.household_id);
      // Aici am avea ideal o coloană `bank_account_uid` per account; în lipsa
      // ei, listăm conturile remote și le potrivim aproximativ după nume.

      const remoteRes = await ebFetch<{
        accounts: Array<{
          uid: string;
          iban?: string;
          name?: string;
          currency: string;
        }>;
      }>(`/sessions/${encodeURIComponent(c.requisition_id ?? "")}/accounts`);

      const fromDate = (() => {
        const last = c.last_synced_at
          ? new Date(c.last_synced_at)
          : new Date(Date.now() - 90 * 86400000);
        last.setDate(last.getDate() - 3); // overlap 3 zile pentru tranzacții pending tardive
        return last.toISOString().slice(0, 10);
      })();
      const toDate = nowIso.slice(0, 10);

      let totalInserted = 0;
      for (const acc of remoteRes.accounts) {
        // Match cu un cont local — preferăm same currency + nume similar.
        const local = (accounts ?? []).find(
          (a) =>
            a.currency === acc.currency &&
            (acc.name ?? "")
              .toLowerCase()
              .includes((a.name ?? "").toLowerCase().slice(0, 6)),
        );
        if (!local) continue;

        const txRes = await ebFetch<{
          transactions: Array<{
            entry_reference?: string;
            transaction_id?: string;
            booking_date: string;
            transaction_amount: { amount: string; currency: string };
            creditor_name?: string;
            debtor_name?: string;
            remittance_information?: string[];
          }>;
        }>(
          `/accounts/${encodeURIComponent(acc.uid)}/transactions?date_from=${fromDate}&date_to=${toDate}`,
        );

        const rows = txRes.transactions
          .map((t) => {
            const valueDecimal = Number(t.transaction_amount.amount);
            if (!Number.isFinite(valueDecimal)) return null;
            const amount = Math.round(valueDecimal * 100);
            const date = t.booking_date.slice(0, 10);
            const description = (t.remittance_information ?? []).join(" ");
            const payee = t.creditor_name ?? t.debtor_name ?? null;
            const ext =
              t.entry_reference ??
              t.transaction_id ??
              `${date}|${amount}|${fnv1a(description ?? "")}`;
            return {
              household_id: c.household_id,
              account_id: local.id,
              user_id: c.user_id,
              occurred_on: date,
              amount,
              currency: t.transaction_amount.currency,
              payee,
              notes: description || null,
              external_id: `eb-${ext}`.slice(0, 120),
              source: "bank_sync" as const,
              bank_connection_id: c.id,
              tags: [],
              status: "cleared" as const,
              ownership: "mine" as const,
              is_transfer: false,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        if (rows.length === 0) continue;
        const { data, error } = await supabase
          .from("transactions")
          .upsert(rows, {
            onConflict: "account_id,external_id",
            ignoreDuplicates: true,
          })
          .select("id");
        if (error) throw new Error(`Upsert: ${error.message}`);
        totalInserted += data?.length ?? 0;
      }

      await supabase
        .from("bank_connections")
        .update({ last_synced_at: nowIso })
        .eq("id", c.id);

      summary.push({ connection_id: c.id, status: `ok ${totalInserted}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Marchează status='error' doar dacă e auth/expired; altfel păstrăm active.
      if (/401|403|expired/i.test(msg)) {
        await supabase
          .from("bank_connections")
          .update({ status: "expired" })
          .eq("id", c.id);
      }
      summary.push({ connection_id: c.id, status: `error: ${msg}` });
    }
  }

  return new Response(JSON.stringify({ ok: true, summary }), {
    headers: { "Content-Type": "application/json" },
  });
});
