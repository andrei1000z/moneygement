// Edge Function weekly-recap — invocată de pg_cron luni la 08:00 EET.
//
// Pentru fiecare household:
//   1. Calculează agregate pe săptămâna trecută (Mon–Sun).
//   2. Compară cu săptămâna anterioară (delta-uri pe categorii top).
//   3. Generează 4 bullets cu Anthropic Sonnet (warm-friend RO).
//   4. Insert în public.recaps (period_start, period_end, bullets, highlight).
//
// Deploy: supabase functions deploy weekly-recap --no-verify-jwt
// (cron-ul trimite Bearer din Vault; verificăm noi.)

import { createClient } from "jsr:@supabase/supabase-js@2";
import { generateObject } from "npm:ai@6";
import { createAnthropic } from "npm:@ai-sdk/anthropic@3";
import webpush from "npm:web-push@3";
import { z } from "npm:zod@4";

const RecapSchema = z.object({
  highlight: z.string().min(5).max(160),
  bullets: z
    .array(
      z.object({
        type: z.enum([
          "income",
          "top_category",
          "subscription_change",
          "savings_win",
          "anomaly",
          "general",
        ]),
        text: z.string().min(5).max(220),
        value: z.number().int().nullable(),
      }),
    )
    .length(4),
});

const SYSTEM = `Ești asistentul Banii. Generezi un recap săptămânal pentru
o gospodărie de doi (mamă & fiu). Primești date agregate și produci
EXACT 4 bullets, fiecare cu un ton de prieten apropiat. Lungime 1-2
propoziții per bullet. Folosește RO cu diacritice. NU inventa cifre —
folosește exact ce-ți e dat. Returnează STRICT JSON.`;

function startOfWeekMonday(d: Date): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Mo=0 ... Su=6
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() - diff);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req: Request) => {
  const expected = Deno.env.get("CRON_SECRET");
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!expected || token !== expected) {
    return new Response("unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return new Response("missing_anthropic_key", { status: 503 });
  }
  const anthropic = createAnthropic({ apiKey: anthropicKey });

  const today = new Date();
  const startOfThisWeek = startOfWeekMonday(today);
  const startOfPrevWeek = new Date(startOfThisWeek);
  startOfPrevWeek.setUTCDate(startOfPrevWeek.getUTCDate() - 7);
  const endOfPrevWeek = new Date(startOfThisWeek);
  endOfPrevWeek.setUTCDate(endOfPrevWeek.getUTCDate() - 1);
  const startOfTwoWeeksAgo = new Date(startOfPrevWeek);
  startOfTwoWeeksAgo.setUTCDate(startOfTwoWeeksAgo.getUTCDate() - 7);

  const { data: households } = await supabase
    .from("households")
    .select("id, name");

  const summary: Array<{ household_id: string; status: string }> = [];

  for (const hh of households ?? []) {
    try {
      const { data: rows } = await supabase
        .from("transactions")
        .select("amount, category_id, occurred_on, is_transfer, payee, currency")
        .eq("household_id", hh.id)
        .gte("occurred_on", isoDate(startOfTwoWeeksAgo))
        .lt("occurred_on", isoDate(startOfThisWeek))
        .eq("is_transfer", false);

      const inThisWeek = (occurred_on: string) =>
        occurred_on >= isoDate(startOfPrevWeek) &&
        occurred_on <= isoDate(endOfPrevWeek);

      const thisWeek = (rows ?? []).filter((r) => inThisWeek(r.occurred_on));
      const prevWeek = (rows ?? []).filter(
        (r) => !inThisWeek(r.occurred_on),
      );

      const thisIncome = thisWeek
        .filter((r) => Number(r.amount) > 0)
        .reduce((acc, r) => acc + Number(r.amount), 0);
      const thisExpense = thisWeek
        .filter((r) => Number(r.amount) < 0)
        .reduce((acc, r) => acc + Math.abs(Number(r.amount)), 0);
      const prevExpense = prevWeek
        .filter((r) => Number(r.amount) < 0)
        .reduce((acc, r) => acc + Math.abs(Number(r.amount)), 0);

      const byCat = new Map<string, number>();
      for (const r of thisWeek) {
        const id = r.category_id ?? "uncategorized";
        if (Number(r.amount) >= 0) continue;
        byCat.set(id, (byCat.get(id) ?? 0) + Math.abs(Number(r.amount)));
      }
      const topCats = [...byCat.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      const aggregate = {
        period: {
          start: isoDate(startOfPrevWeek),
          end: isoDate(endOfPrevWeek),
        },
        income_minor: thisIncome,
        expense_minor: thisExpense,
        prev_week_expense_minor: prevExpense,
        top_categories: topCats.map(([id, total]) => ({ id, total })),
        tx_count: thisWeek.length,
      };

      const { object } = await generateObject({
        model: anthropic("claude-sonnet-4-6"),
        system: SYSTEM,
        schema: RecapSchema,
        prompt:
          `Date săptămâna trecută (RO):\n${JSON.stringify(aggregate, null, 2)}\n\n` +
          `Format ro-RO pentru sume (1.234,56 lei). 4 bullets, ton cald.`,
      });

      await supabase.from("recaps").upsert(
        {
          household_id: hh.id,
          period_start: isoDate(startOfPrevWeek),
          period_end: isoDate(endOfPrevWeek),
          bullets: object.bullets,
          highlight: object.highlight,
        },
        { onConflict: "household_id,period_start,period_end" },
      );

      // Push notification către toți membrii care au push_weekly_recap=true.
      const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
      const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
      if (vapidPublic && vapidPrivate) {
        webpush.setVapidDetails(
          Deno.env.get("VAPID_SUBJECT") ?? "mailto:noreply@banii.app",
          vapidPublic,
          vapidPrivate,
        );
        const { data: members } = await supabase
          .from("household_members")
          .select("user_id")
          .eq("household_id", hh.id);
        for (const m of members ?? []) {
          const { data: prefs } = await supabase
            .from("notification_preferences")
            .select("push_weekly_recap")
            .eq("user_id", m.user_id)
            .maybeSingle();
          if (prefs && prefs.push_weekly_recap === false) continue;
          const { data: subs } = await supabase
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", m.user_id);
          for (const s of subs ?? []) {
            try {
              await webpush.sendNotification(
                {
                  endpoint: s.endpoint,
                  keys: { p256dh: s.p256dh, auth: s.auth },
                },
                JSON.stringify({
                  title: "Recap săptămânal",
                  body: object.highlight.slice(0, 160),
                  url: "/",
                  tag: `recap-${hh.id}-${isoDate(startOfPrevWeek)}`,
                }),
              );
            } catch {
              /* ignore */
            }
          }
        }
      }

      summary.push({ household_id: hh.id, status: "ok" });
    } catch (e) {
      summary.push({
        household_id: hh.id,
        status: e instanceof Error ? `error: ${e.message}` : "error",
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, summary }), {
    headers: { "Content-Type": "application/json" },
  });
});
