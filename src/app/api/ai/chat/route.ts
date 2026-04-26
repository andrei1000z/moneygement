import { NextResponse } from "next/server";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { z } from "zod";

import { systemPromptRO } from "@/lib/ai/prompts";
import { hasAnyProvider, getModel } from "@/lib/ai/providers";
import { buildAiTools } from "@/lib/ai/tools";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  messages: z.array(z.unknown()),
  thread_id: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate-limit: 30 mesaje / 5 minute / user.
  const rl = rateLimit(`chat:${user.id}`, 30, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: rl.retryAfterMs },
      { status: 429 },
    );
  }

  if (!hasAnyProvider()) {
    return NextResponse.json(
      {
        error:
          "Niciun provider AI configurat. Adaugă ANTHROPIC_API_KEY în .env.local.",
      },
      { status: 503 },
    );
  }

  const json = await req.json();
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Determinăm household-ul activ.
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) {
    return NextResponse.json(
      { error: "Niciun household activ" },
      { status: 400 },
    );
  }

  const tools = buildAiTools({
    supabase,
    householdId: profile.active_household,
    userId: user.id,
  });

  const messages = parsed.data.messages as UIMessage[];

  try {
    const result = streamText({
      model: getModel("chat"),
      system: systemPromptRO(),
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(8),
    });

    return result.toUIMessageStreamResponse();
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Eroare necunoscută la chat",
      },
      { status: 500 },
    );
  }
}
