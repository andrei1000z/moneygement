import "server-only";

import { NextResponse } from "next/server";

import { fetchBnrYear, TRACKED_CURRENCIES } from "@/lib/fx";
import { createAdminClient } from "@/lib/supabase/admin";

// Backfill istoric — apelat manual la prima setare a proiectului.
// Body: { years: number[] } sau { last_n_years: number }.
// Auth: header `Authorization: Bearer ${CRON_SECRET}`.
//
// Pentru fiecare an cerut: fetch nbrfxrates{year}.xml, parse, upsert
// (filtrând doar TRACKED_CURRENCIES + adăugând invers RON→ccy).

export const runtime = "nodejs";
export const maxDuration = 60;

const TRACKED = new Set<string>(TRACKED_CURRENCIES);

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return unauthorized();

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (token !== expected) return unauthorized();

  let body: { years?: number[]; last_n_years?: number } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const currentYear = new Date().getUTCFullYear();
  const years: number[] = body.years && body.years.length > 0
    ? body.years
    : Array.from(
        { length: Math.max(1, body.last_n_years ?? 2) },
        (_, i) => currentYear - i,
      );

  const supabase = createAdminClient();
  const summary: Array<{
    year: number;
    inserted: number;
    error?: string;
  }> = [];

  for (const year of years) {
    try {
      const rates = await fetchBnrYear(year);
      const filtered = rates.filter((r) => TRACKED.has(r.base));
      const withInverse = [...filtered];
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

      const rows = withInverse.map((r) => ({
        rate_date: r.rate_date,
        base: r.base,
        quote: r.quote,
        rate: r.rate,
        source: r.source,
      }));

      // Chunk-uri de 1000 ca să nu lovim limitele de payload.
      const CHUNK = 1000;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK);
        const { error } = await supabase
          .from("exchange_rates")
          .upsert(slice, { onConflict: "rate_date,base,quote" });
        if (error) throw new Error(error.message);
        inserted += slice.length;
      }

      await supabase.from("fx_sync_log").insert({
        status: "ok",
        source: "historical",
        currencies_updated: filtered.length,
        rate_date: filtered[0]?.rate_date ?? null,
      });

      summary.push({ year, inserted });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase.from("fx_sync_log").insert({
        status: "error",
        source: "historical",
        currencies_updated: 0,
        error: `Year ${year}: ${msg}`,
      });
      summary.push({ year, inserted: 0, error: msg });
    }
  }

  return NextResponse.json({ ok: true, summary });
}
