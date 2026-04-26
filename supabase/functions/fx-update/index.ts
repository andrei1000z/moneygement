// Edge Function fx-update — invocată de pg_cron prin pg_net.
//
// Flow:
//   1. Verifică Authorization Bearer == app.cron_secret (sau service_role).
//   2. Fetch BNR `nbrfxrates.xml`.
//   3. Parse → upsert în exchange_rates (RON base + invers prin 1/rate).
//   4. Dacă BNR pică, fallback Frankfurter cu base=RON.
//   5. Loggează în fx_sync_log.
//
// Deploy:  supabase functions deploy fx-update --no-verify-jwt
// (no-verify-jwt: pg_cron trimite propriul Bearer; verificăm noi.)

import { createClient } from "jsr:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@5";

const TRACKED = ["EUR", "USD", "GBP", "CHF", "HUF"] as const;

type FxRate = {
  rate_date: string;
  base: string;
  quote: string;
  rate: number;
  source: "BNR" | "Frankfurter";
};

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

type BnrCube = {
  "@_date": string;
  Rate?: BnrRate | BnrRate[];
};
type BnrRate = {
  "#text": number;
  "@_currency": string;
  "@_multiplier"?: number;
};

function parseBnrXml(xml: string): FxRate[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: true,
    parseTagValue: true,
  });
  const parsed = parser.parse(xml) as {
    DataSet?: { Body?: { Cube?: BnrCube | BnrCube[] } };
  };
  const cubes = asArray(parsed.DataSet?.Body?.Cube);
  const out: FxRate[] = [];
  for (const cube of cubes) {
    const date = String(cube["@_date"]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    for (const r of asArray(cube.Rate)) {
      const ccy = String(r["@_currency"] ?? "").toUpperCase();
      const mul = Number(r["@_multiplier"] ?? 1) || 1;
      const v = Number(r["#text"]);
      if (!ccy || !Number.isFinite(v) || v <= 0) continue;
      out.push({
        rate_date: date,
        base: ccy,
        quote: "RON",
        rate: v / mul,
        source: "BNR",
      });
    }
  }
  return out;
}

async function fetchBnr(): Promise<FxRate[]> {
  const res = await fetch("https://www.bnr.ro/nbrfxrates.xml", {
    headers: { "User-Agent": "Banii/0.1 (+banii.app)" },
  });
  if (!res.ok) throw new Error(`BNR HTTP ${res.status}`);
  const xml = await res.text();
  return parseBnrXml(xml);
}

async function fetchFrankfurter(): Promise<FxRate[]> {
  const symbols = TRACKED.join(",");
  const res = await fetch(
    `https://api.frankfurter.app/latest?from=RON&to=${symbols}`,
  );
  if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);
  const json = (await res.json()) as {
    base: string;
    date: string;
    rates: Record<string, number>;
  };
  const out: FxRate[] = [];
  for (const [ccy, rate] of Object.entries(json.rates ?? {})) {
    if (!Number.isFinite(rate) || rate <= 0) continue;
    // Frankfurter dă RON→ccy. Vrem ccy→RON pentru consistență cu BNR,
    // deci inversăm.
    out.push({
      rate_date: json.date,
      base: ccy.toUpperCase(),
      quote: "RON",
      rate: 1 / rate,
      source: "Frankfurter",
    });
  }
  return out;
}

Deno.serve(async (req: Request) => {
  // ---- Autorizare ------------------------------------------------------
  const expected = Deno.env.get("CRON_SECRET");
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let rates: FxRate[] = [];
  let source: "BNR" | "Frankfurter" = "BNR";
  let bnrError: string | null = null;

  // ---- 1) BNR ---------------------------------------------------------
  try {
    rates = await fetchBnr();
  } catch (e) {
    bnrError = e instanceof Error ? e.message : String(e);
  }

  // ---- 2) Fallback Frankfurter ---------------------------------------
  if (rates.length === 0) {
    try {
      rates = await fetchFrankfurter();
      source = "Frankfurter";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase.from("fx_sync_log").insert({
        status: "error",
        source: "Frankfurter",
        currencies_updated: 0,
        error: `BNR: ${bnrError ?? "n/a"} | Frankfurter: ${msg}`,
      });
      return new Response(
        JSON.stringify({ error: "all_sources_failed" }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // ---- 3) Filtrăm doar monedele monitorizate ------------------------
  const filtered = rates.filter((r) =>
    (TRACKED as readonly string[]).includes(r.base),
  );

  // Adăugăm și inversa (RON→ccy) ca să mergem și cross-rate fără pivot.
  const withInverse: FxRate[] = [...filtered];
  for (const r of filtered) {
    if (r.rate > 0) {
      withInverse.push({
        rate_date: r.rate_date,
        base: r.quote,
        quote: r.base,
        rate: 1 / r.rate,
        source: r.source,
      });
    }
  }

  // ---- 4) Upsert ------------------------------------------------------
  const rows = withInverse.map((r) => ({
    rate_date: r.rate_date,
    base: r.base,
    quote: r.quote,
    rate: r.rate,
    source: r.source,
  }));

  const { error } = await supabase.from("exchange_rates").upsert(rows, {
    onConflict: "rate_date,base,quote",
  });

  if (error) {
    await supabase.from("fx_sync_log").insert({
      status: "error",
      source,
      currencies_updated: 0,
      error: `Upsert: ${error.message}`,
    });
    return new Response(
      JSON.stringify({ error: "upsert_failed", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // ---- 5) Log ---------------------------------------------------------
  await supabase.from("fx_sync_log").insert({
    status: "ok",
    source,
    currencies_updated: filtered.length,
    rate_date: filtered[0]?.rate_date ?? null,
    error: bnrError ? `BNR fallback: ${bnrError}` : null,
  });

  return new Response(
    JSON.stringify({
      ok: true,
      source,
      currencies_updated: filtered.length,
      rate_date: filtered[0]?.rate_date ?? null,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
