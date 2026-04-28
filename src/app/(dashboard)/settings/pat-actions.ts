"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { generateToken } from "@/lib/pat/auth";
import { createClient } from "@/lib/supabase/server";
import { firstZodMessage } from "@/lib/zod-utils";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const createSchema = z.object({
  name: z.string().trim().min(1, "Numele e obligatoriu").max(80),
  scopes: z.array(z.enum(["read", "write"])).min(1).max(2),
  expires_in_days: z.number().int().min(1).max(365).optional(),
});

export type CreatePatInput = z.infer<typeof createSchema>;

export async function createPat(
  input: CreatePatInput,
): Promise<ActionResult<{ id: string; token: string; prefix: string }>> {
  const parsed = createSchema.safeParse(input);
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

  const { raw, prefix, hash } = generateToken();
  const expiresAt = parsed.data.expires_in_days
    ? new Date(Date.now() + parsed.data.expires_in_days * 86400 * 1000).toISOString()
    : null;

  const { data, error } = await supabase
    .from("pat_tokens")
    .insert({
      user_id: user.id,
      household_id: profile.active_household,
      name: parsed.data.name,
      token_prefix: prefix,
      token_hash: hash,
      scopes: parsed.data.scopes,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, data: { id: data.id, token: raw, prefix } };
}

export async function revokePat(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pat_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}
