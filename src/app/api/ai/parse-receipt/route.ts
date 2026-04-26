import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RequestSchema = z.object({
  image_url: z.string().url(),
  storage_path: z.string().min(1),
});

const LineItemSchema = z.object({
  description: z.string(),
  amount_minor: z.number().int().nonnegative(),
  category_hint: z.string().nullable(),
});

const ResultSchema = z.object({
  merchant: z.string().nullable(),
  total_minor: z.number().int().nonnegative().nullable(),
  currency: z.string().length(3).default("RON"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  line_items: z.array(LineItemSchema).max(50),
});

const SYSTEM_PROMPT = `Ești un OCR specializat pe bonuri fiscale românești. Extrage din imagine:
- merchant: numele magazinului (ex: Lidl, Carrefour, Mega Image, Profi).
- total_minor: totalul în BANI (1 RON = 100 bani). "12,50 RON" → 1250.
- currency: 'RON' default.
- date: data bonului în format YYYY-MM-DD. null dacă nu e lizibilă.
- line_items: fiecare produs separat, cu description (curățat de coduri), amount_minor (preț TOTAL pe linie, nu unitar), category_hint (Mâncare, Băuturi, Curățenie, Cosmetice, Snacks, Lactate, Carne, Legume, Fructe, Pâine — sau null).

Reguli:
- Ignoră liniile de TVA, total, subtotal — doar produsele.
- Dacă suma totală nu se potrivește cu suma line_items-urilor (±5%), reduce confidence-ul prin a reduce numărul de items.
- Nu inventa produse. Dacă o linie nu e clară, lasă-o afară.
- Bonurile românești au format: "PRODUS BUC PRET TOTAL" sau similar. Folosește totalul.

Returnează STRICT JSON.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`receipt:${user.id}`, 5, 60_000);
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

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key absent" },
      { status: 503 },
    );
  }

  let result: z.infer<typeof ResultSchema>;
  try {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Data curentă: ${new Date().toISOString().slice(0, 10)}. Extrage tranzacția din bonul de mai jos.`,
            },
            { type: "image", image: new URL(payload.image_url) },
          ],
        },
      ],
      schema: ResultSchema,
    });
    result = object;
  } catch (err) {
    console.error("[parse-receipt] GPT-4o failed:", err);
    return NextResponse.json(
      { error: "OCR eșuat", details: err instanceof Error ? err.message : null },
      { status: 502 },
    );
  }

  // Mapăm category_hint pe category_id-uri din DB pentru fiecare linie.
  const categoryByName = new Map<string, string>();
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household")
    .eq("id", user.id)
    .single();
  if (profile?.active_household) {
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name")
      .eq("household_id", profile.active_household);
    for (const c of cats ?? []) {
      categoryByName.set(c.name.toLowerCase(), c.id);
    }
  }

  function resolveCategory(hint: string | null): string | null {
    if (!hint) return null;
    const lower = hint.toLowerCase();
    return categoryByName.get(lower) ?? null;
  }

  return NextResponse.json({
    merchant: result.merchant,
    total: result.total_minor ?? 0,
    currency: result.currency || "RON",
    date: result.date,
    storage_path: payload.storage_path,
    line_items: result.line_items.map((li) => ({
      description: li.description,
      amount: li.amount_minor,
      suggested_category_id: resolveCategory(li.category_hint),
    })),
  });
}
