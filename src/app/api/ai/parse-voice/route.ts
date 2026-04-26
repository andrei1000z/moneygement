import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RequestSchema = z.object({
  transcript: z.string().min(1).max(2000),
});

const ResultSchema = z.object({
  amount_minor: z.number().int().nonnegative().nullable(),
  currency: z.string().length(3).default("RON"),
  merchant: z.string().nullable(),
  category_hint: z.string().nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  notes: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

type Result = z.infer<typeof ResultSchema>;

const SYSTEM_PROMPT = `Ești un parser de tranzacții pentru o aplicație de finanțe personale Romania-first.
Utilizatorul îți spune în română limba vorbită ce a cheltuit / a primit.
Sarcina ta: extrage informația structurată într-un JSON exact.

Reguli:
- amount_minor: număr întreg pozitiv în BANI (1 RON = 100 bani). "10 lei" → 1000. "12,50" → 1250. Dacă nu detectezi suma, null.
- currency: 'RON' default. Doar dacă utilizatorul spune explicit "euro/dolari" → "EUR"/"USD".
- merchant: numele scurt al magazinului / locului (ex: "Lidl", "Mega Image", "Netflix"). null dacă nu menționează.
- category_hint: o categorie tipică românească (Mâncare, Transport, Combustibil, Restaurante, Sănătate, etc.). null dacă neclar.
- date: YYYY-MM-DD. "astăzi" → data curentă. "ieri" → cu o zi în urmă. Dacă nu menționează, null (apelantul va folosi azi).
- notes: descrierea originală a utilizatorului, succint (max 100 caractere). null dacă suma + merchant acoperă tot.
- confidence: 0..1 cât de sigur ești. <0.5 = ambiguu.

Returnează STRICT JSON-ul. Niciun comentariu suplimentar.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`voice:${user.id}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: limit.retryAfterMs },
      { status: 429 },
    );
  }

  let payload: z.infer<typeof RequestSchema>;
  try {
    payload = RequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request", details: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const userPrompt = `Data curentă: ${today}\n\nUser:\n"${payload.transcript}"`;

  let result: Result | null = null;

  // Primary: Groq (Llama 3.3 70B) — rapid, ieftin.
  if (process.env.GROQ_API_KEY) {
    try {
      const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
      const { object } = await generateObject({
        model: groq("llama-3.3-70b-versatile"),
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        schema: ResultSchema,
      });
      result = object;
    } catch (err) {
      console.error("[parse-voice] Groq failed:", err);
    }
  }

  // Fallback: Claude Sonnet 4.6 (mai puternic, mai scump).
  if ((!result || result.confidence < 0.4) && process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const { object } = await generateObject({
        model: anthropic("claude-sonnet-4-6"),
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        schema: ResultSchema,
      });
      result = object;
    } catch (err) {
      console.error("[parse-voice] Claude fallback failed:", err);
    }
  }

  if (!result) {
    return NextResponse.json(
      { error: "AI providers indisponibili" },
      { status: 503 },
    );
  }

  // Convertim result-ul la formatul VoiceParseResult al UI-ului.
  let categoryId: string | null = null;
  if (result.category_hint) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_household")
      .eq("id", user.id)
      .single();
    if (profile?.active_household) {
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name")
        .eq("household_id", profile.active_household)
        .ilike("name", `%${result.category_hint}%`)
        .limit(1);
      categoryId = cats?.[0]?.id ?? null;
    }
  }

  return NextResponse.json({
    amount: result.amount_minor,
    currency: result.currency || "RON",
    merchant: result.merchant,
    category_id: categoryId,
    date: result.date,
    notes: result.notes,
  });
}
