import { createClient } from "@/lib/supabase/server";

import { OnboardingBanner } from "./onboarding-banner";

/**
 * Server component care detectează dacă userul are gospodărie goală
 * (zero conturi active) și afișează OnboardingBanner cu CTA pentru
 * adăugare cont sau seed demo data.
 */
export async function OnboardingSection() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) return null;

  const { count } = await supabase
    .from("accounts")
    .select("*", { count: "exact", head: true })
    .eq("household_id", profile.active_household)
    .is("archived_at", null);

  if ((count ?? 0) > 0) return null;

  return <OnboardingBanner />;
}
