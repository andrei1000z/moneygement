import { redirect } from "next/navigation";

import { AppearancePanel } from "@/components/features/settings/appearance-panel";
import { HouseholdMembersPanel } from "@/components/features/settings/household-members-panel";
import { NotificationsPanel } from "@/components/features/settings/notifications-panel";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
    .select("active_household, full_name, language, default_currency")
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

  const { data: notifPrefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const initialNotifPrefs = {
    push_bills: notifPrefs?.push_bills ?? true,
    push_anomalies: notifPrefs?.push_anomalies ?? true,
    push_goal_milestones: notifPrefs?.push_goal_milestones ?? true,
    push_weekly_recap: notifPrefs?.push_weekly_recap ?? true,
    push_low_balance: notifPrefs?.push_low_balance ?? true,
    push_bank_reauth: notifPrefs?.push_bank_reauth ?? true,
    push_anniversaries: notifPrefs?.push_anniversaries ?? false,
    quiet_start: notifPrefs?.quiet_start ?? null,
    quiet_end: notifPrefs?.quiet_end ?? null,
    low_balance_threshold_minor:
      notifPrefs?.low_balance_threshold_minor ?? 50000,
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Setări</h1>
      </header>

      <Tabs defaultValue="household">
        <TabsList className="mb-4">
          <TabsTrigger value="household">Membri</TabsTrigger>
          <TabsTrigger value="notifications">Notificări</TabsTrigger>
          <TabsTrigger value="appearance">Aspect</TabsTrigger>
          <TabsTrigger value="profile">Profil</TabsTrigger>
        </TabsList>

        <TabsContent value="household">
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
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsPanel initial={initialNotifPrefs} />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearancePanel />
        </TabsContent>

        <TabsContent value="profile">
          <div className="border-border/60 bg-card space-y-3 rounded-xl border p-4">
            <Field label="Email" value={user.email ?? "—"} />
            <Field label="Nume" value={profile.full_name ?? "—"} />
            <Field
              label="Limbă"
              value={profile.language === "en" ? "Engleză" : "Română"}
            />
            <Field
              label="Monedă implicită"
              value={profile.default_currency ?? "RON"}
            />
            <p className="text-muted-foreground text-xs">
              Editarea profilului va veni în V2. Pentru acum, contactează
              owner-ul gospodăriei pentru orice modificare.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b py-2 last:border-b-0">
      <span className="text-muted-foreground text-xs uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
