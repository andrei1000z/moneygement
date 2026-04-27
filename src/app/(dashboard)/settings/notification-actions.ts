"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { firstZodMessage } from "@/lib/zod-utils";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const prefsSchema = z.object({
  push_bills: z.boolean(),
  push_anomalies: z.boolean(),
  push_goal_milestones: z.boolean(),
  push_weekly_recap: z.boolean(),
  push_low_balance: z.boolean(),
  push_bank_reauth: z.boolean(),
  push_anniversaries: z.boolean(),
  quiet_start: z
    .string()
    .regex(timeRegex)
    .nullable()
    .optional(),
  quiet_end: z.string().regex(timeRegex).nullable().optional(),
  low_balance_threshold_minor: z.number().int().min(0).max(100_00000),
});

export type NotificationPrefsInput = z.infer<typeof prefsSchema>;

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function updateNotificationPrefs(
  input: NotificationPrefsInput,
): Promise<ActionResult> {
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    ...parsed.data,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, data: undefined };
}
