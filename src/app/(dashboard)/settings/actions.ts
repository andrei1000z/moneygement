"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { firstZodMessage } from "@/lib/zod-utils";

const inviteSchema = z.object({
  email: z.email("Email invalid").max(254),
  role: z.enum(["admin", "member", "viewer"]),
});

export type InviteInput = z.infer<typeof inviteSchema>;

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type InviteWithLink = {
  id: string;
  invited_email: string;
  role: "admin" | "member" | "viewer";
  token: string;
  invite_url: string;
  expires_at: string;
};

function inviteUrl(token: string): string {
  // Folosim NEXT_PUBLIC_SITE_URL când e setat (deploy), altfel relativ.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const path = `/invite/${token}`;
  return base ? `${base.replace(/\/$/, "")}${path}` : path;
}

/**
 * Creează o invitație nominală. Generează token random 32 bytes,
 * inserează în household_invites. Trimiterea email-ului e responsabilitatea
 * apelantului (UI afișează link-ul + buton "Copiază" și „Trimite la mama").
 *
 * Politică: token-ul rămâne valid 7 zile. Doar owner / admin pot crea
 * invitații (verificat de RLS).
 */
export async function createInvite(
  input: InviteInput,
): Promise<ActionResult<InviteWithLink>> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  // Rate-limit: max 10 invitații / oră / user.
  const rl = rateLimit(`invite:${user.id}`, 10, 60 * 60 * 1000);
  if (!rl.ok) {
    return {
      ok: false,
      error: `Prea multe invitații. Reîncearcă în ${Math.ceil(
        rl.retryAfterMs / 1000 / 60,
      )} min.`,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) {
    return { ok: false, error: "Niciun household activ" };
  }

  const token = randomBytes(32).toString("hex");
  const { data, error } = await supabase
    .from("household_invites")
    .insert({
      household_id: profile.active_household,
      invited_email: parsed.data.email.trim().toLowerCase(),
      role: parsed.data.role,
      token,
      created_by: user.id,
    })
    .select("id, invited_email, role, token, expires_at")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/settings");

  return {
    ok: true,
    data: {
      id: data.id,
      invited_email: data.invited_email,
      role: data.role,
      token: data.token,
      invite_url: inviteUrl(data.token),
      expires_at: data.expires_at,
    },
  };
}

/**
 * Revoke o invitație neacceptată. Doar owner / admin (verificat RLS).
 */
export async function revokeInvite(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const { error } = await supabase
    .from("household_invites")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

// ---------- Profile / household edit ------------------------------------

const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(1, "Numele e obligatoriu").max(100),
  language: z.enum(["ro", "en"]).optional(),
  default_currency: z.string().length(3).optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export async function updateProfile(
  input: ProfileUpdateInput,
): Promise<ActionResult> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodMessage(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      language: parsed.data.language,
      default_currency: parsed.data.default_currency,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

const householdUpdateSchema = z.object({
  name: z.string().trim().min(1, "Numele household-ului e obligatoriu").max(80),
  base_currency: z.string().length(3).optional(),
});

export type HouseholdUpdateInput = z.infer<typeof householdUpdateSchema>;

export async function updateHousehold(
  input: HouseholdUpdateInput,
): Promise<ActionResult> {
  const parsed = householdUpdateSchema.safeParse(input);
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

  const { error } = await supabase
    .from("households")
    .update({
      name: parsed.data.name,
      base_currency: parsed.data.base_currency,
    })
    .eq("id", profile.active_household);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

/**
 * Acceptă o invitație via RPC. Folosit de pagina /invite/[token].
 */
export async function acceptInviteAction(
  token: string,
): Promise<ActionResult<{ household_id: string; role: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Trebuie să fii autentificat" };

  const { data, error } = await supabase.rpc("accept_invite", { _token: token });

  if (error) {
    const code = error.code;
    if (code === "42501") return { ok: false, error: "Trebuie să fii autentificat" };
    if (code === "P0002") return { ok: false, error: "Invitație inexistentă" };
    if (code === "P0001") {
      // Folosim mesajul exact din error.message (invite_expired / invite_already_used)
      const msg = error.message?.includes("expired")
        ? "Invitația a expirat"
        : "Invitația a fost deja folosită";
      return { ok: false, error: msg };
    }
    return { ok: false, error: error.message };
  }

  const row = data?.[0];
  if (!row) return { ok: false, error: "Răspuns invalid" };

  revalidatePath("/", "layout");
  return {
    ok: true,
    data: { household_id: row.household_id, role: row.role },
  };
}
