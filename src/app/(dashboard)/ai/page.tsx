import { redirect } from "next/navigation";

import { ChatScreen } from "@/components/features/ai-chat/chat-screen";
import { hasAnyProvider } from "@/lib/ai/providers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="container mx-auto flex h-[calc(100svh-5rem)] max-w-3xl flex-col px-3 py-4 md:h-screen md:py-6">
      <header className="mb-3">
        <h1 className="text-xl font-bold">Asistent</h1>
        <p className="text-muted-foreground text-xs">
          Pune întrebări despre banii voștri. Vede toate tranzacțiile,
          bugetele și obiectivele.
        </p>
      </header>
      {hasAnyProvider() ? (
        <ChatScreen />
      ) : (
        <NoProvider />
      )}
    </div>
  );
}

function NoProvider() {
  return (
    <div className="glass-thin flex flex-1 items-center justify-center rounded-[--radius-card] p-6">
      <div className="max-w-sm text-center">
        <p className="text-sm font-semibold">AI nu e configurat</p>
        <p className="text-muted-foreground mt-2 text-xs">
          Adaugă <code className="bg-muted rounded px-1">ANTHROPIC_API_KEY</code>
          {" sau "}
          <code className="bg-muted rounded px-1">GROQ_API_KEY</code> în
          <code className="bg-muted ml-1 rounded px-1">.env.local</code>{" "}
          pentru a activa chat-ul.
        </p>
      </div>
    </div>
  );
}
