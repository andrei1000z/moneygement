import { redirect } from "next/navigation";

import { AuroraBackground } from "@/components/effects/aurora-background";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Dacă env-ul Supabase nu e configurat încă, lăsăm pagina să se randeze
  // (ca să poți deschide /login local înainte de a configura Supabase).
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/");
  }

  return (
    <>
      <AuroraBackground />
      <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </>
  );
}
