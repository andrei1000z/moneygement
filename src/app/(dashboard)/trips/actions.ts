"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { firstZodMessage } from "@/lib/zod-utils";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const tripInputSchema = z.object({
  name: z.string().trim().min(1, "Numele e obligatoriu").max(100),
  country_code: z
    .string()
    .length(2)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  started_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data ISO invalidă"),
  ended_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data ISO invalidă")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  base_currency: z.string().length(3).default("RON"),
  budget_minor: z.number().int().nonnegative().optional(),
  tag: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^trip_[a-z0-9_]+$/, "Tag-ul trebuie să fie 'trip_<slug>'"),
});

export type TripInput = z.infer<typeof tripInputSchema>;

export async function createTrip(
  input: TripInput,
): Promise<ActionResult<{ id: string; tagged_count: number }>> {
  const parsed = tripInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) {
    return { ok: false, error: "Niciun household activ" };
  }

  const { data: trip, error } = await supabase
    .from("trips")
    .insert({
      household_id: profile.active_household,
      name: parsed.data.name,
      country_code: parsed.data.country_code ?? null,
      started_on: parsed.data.started_on,
      ended_on: parsed.data.ended_on ?? null,
      base_currency: parsed.data.base_currency,
      budget_minor: parsed.data.budget_minor ?? null,
      tag: parsed.data.tag,
      detected_automatically: false,
    })
    .select("id, tag, started_on, ended_on")
    .single();
  if (error) return { ok: false, error: error.message };

  // Backfill tag pe tranzacțiile existente în range. Trebuie făcut manual
  // pentru că trigger-ul fn_auto_tag_trip e BEFORE INSERT (nu se aplică
  // pe rândurile existente).
  const { data: existingTxs } = await supabase
    .from("transactions")
    .select("id, tags")
    .eq("household_id", profile.active_household)
    .gte("occurred_on", trip.started_on)
    .lte(
      "occurred_on",
      trip.ended_on ?? new Date().toISOString().slice(0, 10),
    );

  let taggedCount = 0;
  for (const t of existingTxs ?? []) {
    const tags = (t.tags ?? []) as string[];
    if (tags.includes(trip.tag)) continue;
    await supabase
      .from("transactions")
      .update({ tags: [...tags, trip.tag] })
      .eq("id", t.id);
    taggedCount++;
  }

  revalidatePath("/trips");
  revalidatePath("/");
  return { ok: true, data: { id: trip.id, tagged_count: taggedCount } };
}

export async function archiveTrip(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("trips")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/trips");
  return { ok: true, data: undefined };
}

export async function deleteTrip(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/trips");
  return { ok: true, data: undefined };
}
