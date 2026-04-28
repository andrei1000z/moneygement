// Edge Function push-dispatch — invocată zilnic la 07:00 UTC.
//
// Trimite notificări push pentru:
//   - bill reminders (recurring tx scheduled în următoarele 24h)
//   - low-balance alerts (sold cont sub threshold per user prefs)
//   - bank reauth alerts (bank_connections expiră < 7 zile)
//   - spending anniversaries (1 an / 5 ani în urmă, dacă activat)
//
// Respectă notification_preferences per user + quiet hours.
// Nu trimite duplicate (folosește tag-uri pe notification + ZIUA curentă).

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

type Subscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type Prefs = {
  user_id: string;
  push_bills: boolean;
  push_low_balance: boolean;
  push_bank_reauth: boolean;
  push_anniversaries: boolean;
  quiet_start: string | null;
  quiet_end: string | null;
  low_balance_threshold_minor: number;
};

function inQuietWindow(prefs: Prefs, now: Date): boolean {
  if (!prefs.quiet_start || !prefs.quiet_end) return false;
  const [hStart, mStart] = prefs.quiet_start.split(":").map(Number);
  const [hEnd, mEnd] = prefs.quiet_end.split(":").map(Number);
  if (
    !Number.isFinite(hStart) ||
    !Number.isFinite(hEnd) ||
    hStart === undefined ||
    hEnd === undefined
  ) {
    return false;
  }
  const minutesNow = now.getUTCHours() * 60 + now.getUTCMinutes();
  const start = hStart * 60 + (mStart ?? 0);
  const end = hEnd * 60 + (mEnd ?? 0);
  if (start <= end) return minutesNow >= start && minutesNow < end;
  // Wraparound (ex: 22:00 → 08:00).
  return minutesNow >= start || minutesNow < end;
}

async function sendToUser(
  vapidConfigured: boolean,
  subs: Subscription[],
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<void> {
  if (!vapidConfigured || subs.length === 0) return;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
    } catch {
      // Lăsăm cleanup-ul subscription-urilor expired pe lib/push/send.ts (când
      // aplicația apelează direct).
    }
  }
}

Deno.serve(async (req: Request) => {
  const expected = Deno.env.get("CRON_SECRET");
  const auth = req.headers.get("Authorization") ?? "";
  if (!expected || auth.replace(/^Bearer\s+/i, "") !== expected) {
    return new Response("unauthorized", { status: 401 });
  }

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject =
    Deno.env.get("VAPID_SUBJECT") ?? "mailto:noreply@banii.app";

  const vapidConfigured =
    vapidPublic !== undefined && vapidPrivate !== undefined;
  if (vapidConfigured) {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000)
    .toISOString()
    .slice(0, 10);

  // Pre-load: prefs + subscriptions per user.
  const { data: allSubs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");
  const subsByUser = new Map<string, Subscription[]>();
  for (const s of allSubs ?? []) {
    const arr = subsByUser.get(s.user_id) ?? [];
    arr.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
    subsByUser.set(s.user_id, arr);
  }

  const { data: allPrefs } = await supabase
    .from("notification_preferences")
    .select(
      "user_id, push_bills, push_low_balance, push_bank_reauth, push_anniversaries, quiet_start, quiet_end, low_balance_threshold_minor",
    );
  const prefsByUser = new Map<string, Prefs>();
  for (const p of allPrefs ?? []) {
    prefsByUser.set(p.user_id, p as Prefs);
  }

  function getPrefs(userId: string): Prefs {
    return (
      prefsByUser.get(userId) ?? {
        user_id: userId,
        push_bills: true,
        push_low_balance: true,
        push_bank_reauth: true,
        push_anniversaries: true,
        quiet_start: null,
        quiet_end: null,
        low_balance_threshold_minor: 50000,
      }
    );
  }

  const summary: { kind: string; sent: number }[] = [];

  // ---------- 1) Bill reminders --------------------------------------
  // recurring_transactions cu next_due_at în [now, now+1d).
  const { data: recurring } = await supabase
    .from("recurring_transactions")
    .select("id, household_id, name, amount, currency, next_due_at")
    .gte("next_due_at", todayIso)
    .lt("next_due_at", tomorrow);

  let billsSent = 0;
  for (const r of recurring ?? []) {
    const { data: members } = await supabase
      .from("household_members")
      .select("user_id")
      .eq("household_id", r.household_id);
    for (const m of members ?? []) {
      const prefs = getPrefs(m.user_id);
      if (!prefs.push_bills) continue;
      if (inQuietWindow(prefs, now)) continue;
      const subs = subsByUser.get(m.user_id) ?? [];
      const amount = Math.abs(Number(r.amount)) / 100;
      await sendToUser(vapidConfigured, subs, {
        title: "Plată recurentă mâine",
        body: `${r.name ?? "Recurent"}: ${amount.toFixed(2)} ${r.currency}`,
        url: "/transactions",
        tag: `bill-${r.id}`,
      });
      billsSent++;
    }
  }
  summary.push({ kind: "bills", sent: billsSent });

  // ---------- 2) Low balance alerts ----------------------------------
  let lowBalSent = 0;
  for (const [userId, prefs] of prefsByUser) {
    if (!prefs.push_low_balance) continue;
    if (inQuietWindow(prefs, now)) continue;
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, name, currency, current_balance, household_id, owner_id")
      .eq("owner_id", userId)
      .is("archived_at", null);
    for (const a of accounts ?? []) {
      const balance = Number(a.current_balance ?? 0);
      if (balance < prefs.low_balance_threshold_minor) {
        const subs = subsByUser.get(userId) ?? [];
        await sendToUser(vapidConfigured, subs, {
          title: "Sold scăzut",
          body: `${a.name}: ${(balance / 100).toFixed(2)} ${a.currency}`,
          url: `/accounts`,
          tag: `low-${a.id}`,
        });
        lowBalSent++;
      }
    }
  }
  summary.push({ kind: "low_balance", sent: lowBalSent });

  // ---------- 3) Bank reauth alerts ----------------------------------
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86400000).toISOString();
  const { data: expiringConns } = await supabase
    .from("bank_connections")
    .select("id, user_id, institution_name, expires_at")
    .eq("status", "active")
    .gt("expires_at", now.toISOString())
    .lt("expires_at", sevenDaysFromNow);
  let reauthSent = 0;
  for (const conn of expiringConns ?? []) {
    const prefs = getPrefs(conn.user_id);
    if (!prefs.push_bank_reauth) continue;
    if (inQuietWindow(prefs, now)) continue;
    const days = Math.max(
      0,
      Math.ceil(
        (new Date(conn.expires_at!).getTime() - now.getTime()) / 86400000,
      ),
    );
    const subs = subsByUser.get(conn.user_id) ?? [];
    await sendToUser(vapidConfigured, subs, {
      title: "Reautentifică banca",
      body: `${conn.institution_name ?? "Conexiune"} expiră în ${days} ${days === 1 ? "zi" : "zile"}.`,
      url: "/connections",
      tag: `reauth-${conn.id}`,
    });
    reauthSent++;
  }
  summary.push({ kind: "bank_reauth", sent: reauthSent });

  // ---------- 4) Spending anniversaries ------------------------------
  let anniSent = 0;
  for (const [userId, prefs] of prefsByUser) {
    if (!prefs.push_anniversaries) continue;
    if (inQuietWindow(prefs, now)) continue;
    const oneYearAgo = new Date(now);
    oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
    const targetIso = oneYearAgo.toISOString().slice(0, 10);

    const { data: txs } = await supabase
      .from("transactions")
      .select("payee, amount, currency, occurred_on")
      .eq("user_id", userId)
      .eq("is_transfer", false)
      .eq("occurred_on", targetIso)
      .order("amount", { ascending: true })
      .limit(1);
    const top = txs?.[0];
    if (!top) continue;
    const subs = subsByUser.get(userId) ?? [];
    await sendToUser(vapidConfigured, subs, {
      title: "Acum un an…",
      body: `${top.payee ?? "Tranzacție"} — ${(
        Math.abs(Number(top.amount)) / 100
      ).toFixed(2)} ${top.currency}`,
      url: "/transactions",
      tag: `anni-${userId}-${targetIso}`,
    });
    anniSent++;
  }
  summary.push({ kind: "anniversaries", sent: anniSent });

  return new Response(JSON.stringify({ ok: true, summary }), {
    headers: { "Content-Type": "application/json" },
  });
});
