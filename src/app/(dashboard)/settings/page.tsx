import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Tags } from "lucide-react";

import { AppearancePanel } from "@/components/features/settings/appearance-panel";
import { ExportPanel } from "@/components/features/settings/export-panel";
import { HouseholdMembersPanel } from "@/components/features/settings/household-members-panel";
import { NotificationsPanel } from "@/components/features/settings/notifications-panel";
import { PasskeyPanel } from "@/components/features/settings/passkey-panel";
import { ProfilePanel } from "@/components/features/settings/profile-panel";
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

  // Household pentru numele afișat și moneda de bază.
  const { data: household } = await supabase
    .from("households")
    .select("name, base_currency")
    .eq("id", profile.active_household)
    .single();

  // Passkey-urile userului.
  const { data: passkeys } = await supabase
    .from("webauthn_credentials")
    .select("id, device_name, created_at, last_used_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

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
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="household">Membri</TabsTrigger>
          <TabsTrigger value="notifications">Notificări</TabsTrigger>
          <TabsTrigger value="appearance">Aspect</TabsTrigger>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="links">Linkuri</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
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

        <TabsContent value="profile" className="space-y-5">
          <ProfilePanel
            email={user.email ?? "—"}
            initial={{
              full_name: profile.full_name,
              language: profile.language,
              default_currency: profile.default_currency,
              household_name: household?.name ?? "Casa mea",
              base_currency: household?.base_currency ?? "RON",
            }}
          />
          <PasskeyPanel initial={passkeys ?? []} />
        </TabsContent>

        <TabsContent value="links">
          <div className="glass-thin divide-y divide-(--glass-border) rounded-(--radius-card)">
            <LinkRow
              href="/categories"
              label="Categorii"
              description="Adaugă, redenumește sau arhivează categorii."
              Icon={Tags}
            />
            <LinkRow
              href="/connections"
              label="Conexiuni bancare"
              description="Conturi conectate prin Enable Banking + status SCA."
              Icon={Building2}
            />
            <LinkRow
              href="/income"
              label="Surse de venit"
              description="Salarii, pensii și alte plăți recurente detectate."
              Icon={Building2}
            />
            <LinkRow
              href="/pension"
              label="Pilon III"
              description="Tracker pentru contribuții deductibile (400 EUR/an)."
              Icon={Building2}
            />
            <LinkRow
              href="/accounts/meal-vouchers"
              label="Tichete masă"
              description="Loturi cu expiry tracking pe 12 luni."
              Icon={Building2}
            />
          </div>
        </TabsContent>

        <TabsContent value="export">
          <ExportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LinkRow({
  href,
  label,
  description,
  Icon,
}: {
  href: string;
  label: string;
  description: string;
  Icon: typeof Tags;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-accent/40 flex items-center gap-3 px-4 py-3 transition"
    >
      <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <span aria-hidden className="text-muted-foreground">
        →
      </span>
    </Link>
  );
}
