import { redirect } from "next/navigation";

import { CommandPalette } from "@/components/features/ai-chat/command-palette";
import { BottomTabBar, Sidebar } from "@/components/features/dashboard/nav";
import { ConnectionStatus } from "@/components/features/pwa/connection-status";
import { InstallPrompt } from "@/components/features/pwa/install-prompt";
import { OfflineDrainer } from "@/components/features/pwa/offline-drainer";
import { PushPrompt } from "@/components/features/pwa/push-prompt";
import { QuickAddSheet } from "@/components/features/quick-add/quick-add-sheet";
import { AuroraBackground } from "@/components/effects/aurora-background";
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
    <div className="flex min-h-svh flex-col">
      <AuroraBackground />
      <ConnectionStatus />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <main
            className="flex-1 overflow-y-auto md:pr-3 md:pb-0"
            style={{
              paddingBottom: "calc(6rem + env(safe-area-inset-bottom))",
            }}
          >
            {children}
          </main>
        </div>
      </div>
      <BottomTabBar />
      <QuickAddSheet />
      <CommandPalette />
      <InstallPrompt />
      <PushPrompt />
      <OfflineDrainer />
    </div>
  );
}
