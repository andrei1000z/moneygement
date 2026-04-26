import "server-only";

import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";

let configured = false;

function configure() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:musattiberiu@gmail.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
};

/**
 * Trimite o notificare push către toate subscription-urile unui user.
 * Curăță automat subscription-urile expired (HTTP 410).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!configure()) {
    console.warn("[push] VAPID keys not configured");
    return { sent: 0, removed: 0 };
  }

  const supabase = createAdminClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  let sent = 0;
  let removed = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        },
        JSON.stringify(payload),
      );
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", s.id);
        removed++;
      }
    }
  }

  return { sent, removed };
}

/**
 * Trimite push tuturor membrilor unui household.
 */
export async function sendPushToHousehold(
  householdId: string,
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!configure()) return { sent: 0, removed: 0 };
  const supabase = createAdminClient();
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId);

  const totals = { sent: 0, removed: 0 };
  for (const m of members ?? []) {
    const r = await sendPushToUser(m.user_id, payload);
    totals.sent += r.sent;
    totals.removed += r.removed;
  }
  return totals;
}
