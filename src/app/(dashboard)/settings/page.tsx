import { redirect } from "next/navigation";

import { HouseholdMembersPanel } from "@/components/features/settings/household-members-panel";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) redirect("/");

  // Membri actuali (cu profile pentru nume).
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, role, joined_at")
    .eq("household_id", profile.active_household)
    .order("joined_at", { ascending: true });

  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length > 0
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids)
    : { data: [] };
  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name ?? "—"]),
  );

  // Invitații pending.
  const { data: invites } = await supabase
    .from("household_invites")
    .select("id, invited_email, role, token, expires_at, accepted_at, created_at")
    .eq("household_id", profile.active_household)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  const isOwnerOrAdmin =
    (members ?? []).find((m) => m.user_id === user.id)?.role === "owner" ||
    (members ?? []).find((m) => m.user_id === user.id)?.role === "admin";

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Setări</h1>
        <p className="text-muted-foreground text-sm">
          Membrii gospodăriei și invitațiile.
        </p>
      </header>

      <HouseholdMembersPanel
        currentUserId={user.id}
        members={(members ?? []).map((m) => ({
          user_id: m.user_id,
          role: m.role,
          joined_at: m.joined_at,
          full_name: nameById.get(m.user_id) ?? null,
        }))}
        invites={(invites ?? []).map((i) => ({
          id: i.id,
          email: i.invited_email,
          role: i.role,
          token: i.token,
          expires_at: i.expires_at,
        }))}
        canInvite={isOwnerOrAdmin}
      />
    </div>
  );
}
