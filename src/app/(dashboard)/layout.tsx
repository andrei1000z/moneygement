import { redirect } from "next/navigation";

import { BottomTabBar, Sidebar } from "@/components/features/dashboard/nav";
import { ConnectionStatus } from "@/components/features/pwa/connection-status";
import { InstallPrompt } from "@/components/features/pwa/install-prompt";
import { QuickAddSheet } from "@/components/features/quick-add/quick-add-sheet";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Permitem `npm run dev` fără Supabase configurat (afișează shell-ul gol);
  // o dată ce env-ul e prezent (Faza 1+), aplicăm hard-redirect la /login.
  if (url && anon) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }

  return (
    <div className="bg-background flex min-h-svh flex-col">
      <ConnectionStatus />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <main
            className="flex-1 overflow-y-auto pb-20 md:pb-0"
            style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
          >
            {children}
          </main>
        </div>
      </div>
      <BottomTabBar />
      <QuickAddSheet />
      <InstallPrompt />
    </div>
  );
}
