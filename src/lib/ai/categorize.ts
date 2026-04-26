import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import type { createClient } from "@/lib/supabase/server";

import {
  generateEmbedding,
  toPgVector,
  transactionToEmbeddingText,
  type EmbeddingInput,
} from "./embeddings";
import { aiEnv, getModel } from "./providers";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type CategorizeInput = EmbeddingInput & {
  /** Suma în unități minore (semnată). */
  amount: number;
  currency: string;
  account_id: string;
};

export type CategorizeResult = {
  category_id: string | null;
  confidence: number;
  source: "rule" | "knn" | "llm" | "none";
};

const KNN_THRESHOLD = 0.85;
const KNN_MIN_NEIGHBORS = 3;
const LLM_RESULT_SCHEMA = z.object({
  category_id: z.string().uuid().nullable(),
  confidence: z.number().min(0).max(1),
});

/**
 * Categorizator 3-tier:
 *   1. RULES — match pe priority asc; primul activ care match-uiește câștigă
 *   2. KNN — embedding similarity ≥ THRESHOLD pe ≥ MIN_NEIGHBORS vecini
 *      cu aceeași categorie => câștigă
 *   3. LLM — Sonnet 4.6 cu lista completă de categorii ca enum
 *
 * Returnează `{ category_id: null, confidence: 0, source: 'none' }` dacă
 * niciun tier nu e sigur (sau dacă AI-ul nu e configurat).
 */
export async function categorize(
  supabase: SupabaseServer,
  householdId: string,
  tx: CategorizeInput,
): Promise<CategorizeResult> {
  // ---- Tier 1: rules -------------------------------------------------
  const rule = await matchRule(supabase, householdId, tx);
  if (rule.category_id) {
    return { category_id: rule.category_id, confidence: 1, source: "rule" };
  }

  // ---- Pre-load categories pentru tier 2 + 3 -------------------------
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, type")
    .eq("household_id", householdId);
  if (!categories || categories.length === 0) {
    return { category_id: null, confidence: 0, source: "none" };
  }

  // ---- Tier 2: KNN cu embeddings ------------------------------------
  if (aiEnv.openaiKey()) {
    try {
      const text = transactionToEmbeddingText(tx);
      if (text.length > 2) {
        const embedding = await generateEmbedding(text);
        const knn = await knnVote(supabase, householdId, embedding);
        if (knn.category_id) {
          return {
            category_id: knn.category_id,
            confidence: knn.confidence,
            source: "knn",
          };
        }
      }
    } catch {
      // Embedding-ul e best-effort; fallback la LLM.
    }
  }

  // ---- Tier 3: LLM ---------------------------------------------------
  if (aiEnv.anthropicKey() || aiEnv.groqKey()) {
    try {
      const { object } = await generateObject({
        model: getModel("categorize-fallback"),
        system:
          "Ești un categorizator de tranzacții pentru o aplicație de finanțe " +
          "personale româneşti. Alege categoria cea mai potrivită din lista " +
          "dată. Returnează STRICT JSON-ul cu category_id (sau null dacă nu " +
          "e clar) și confidence (0-1). Nu inventa id-uri.",
        schema: LLM_RESULT_SCHEMA,
        prompt: buildLlmPrompt(tx, categories),
      });
      // Verificăm că id-ul există într-adevăr.
      if (
        object.category_id &&
        categories.some((c) => c.id === object.category_id)
      ) {
        return {
          category_id: object.category_id,
          confidence: object.confidence,
          source: "llm",
        };
      }
    } catch {
      // LLM down — întoarcem none.
    }
  }

  return { category_id: null, confidence: 0, source: "none" };
}

// ---------------------------------------------------------------- Helpers

async function matchRule(
  supabase: SupabaseServer,
  householdId: string,
  tx: CategorizeInput,
): Promise<{ category_id: string | null }> {
  const { data: rules } = await supabase
    .from("rules")
    .select(
      "id, priority, set_category_id, match_payee_regex, match_account_id, match_min_amount, match_max_amount, match_currency",
    )
    .eq("household_id", householdId)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (!rules || rules.length === 0) return { category_id: null };

  const text = `${tx.payee ?? ""} ${tx.notes ?? ""}`.trim();
  for (const r of rules) {
    if (r.match_account_id && r.match_account_id !== tx.account_id) continue;
    if (r.match_currency && r.match_currency !== tx.currency) continue;
    if (r.match_min_amount != null && Math.abs(tx.amount) < Math.abs(r.match_min_amount))
      continue;
    if (r.match_max_amount != null && Math.abs(tx.amount) > Math.abs(r.match_max_amount))
      continue;
    if (r.match_payee_regex) {
      try {
        const re = new RegExp(r.match_payee_regex, "i");
        if (!re.test(text)) continue;
      } catch {
        continue;
      }
    }
    if (r.set_category_id) return { category_id: r.set_category_id };
  }
  return { category_id: null };
}

async function knnVote(
  supabase: SupabaseServer,
  householdId: string,
  embedding: number[],
): Promise<{ category_id: string | null; confidence: number }> {
  const { data, error } = await supabase.rpc("match_transactions", {
    _household: householdId,
    _query_embedding: toPgVector(embedding),
    _limit: 10,
  });
  if (error || !data) return { category_id: null, confidence: 0 };

  // Filtrăm vecinii sub threshold și fără categorie.
  const eligible = data.filter(
    (n) => n.similarity >= KNN_THRESHOLD && n.category_id !== null,
  );
  if (eligible.length < KNN_MIN_NEIGHBORS) {
    return { category_id: null, confidence: 0 };
  }

  // Vot ponderat de similaritate.
  const tally = new Map<string, number>();
  for (const n of eligible) {
    if (!n.category_id) continue;
    tally.set(n.category_id, (tally.get(n.category_id) ?? 0) + n.similarity);
  }
  let bestId: string | null = null;
  let bestWeight = 0;
  let totalWeight = 0;
  for (const [id, w] of tally) {
    totalWeight += w;
    if (w > bestWeight) {
      bestWeight = w;
      bestId = id;
    }
  }

  const confidence = totalWeight === 0 ? 0 : bestWeight / totalWeight;
  return { category_id: bestId, confidence };
}

function buildLlmPrompt(
  tx: CategorizeInput,
  categories: { id: string; name: string; type: string | null }[],
): string {
  const catList = categories
    .map((c) => `- ${c.id} → "${c.name}" (${c.type ?? "—"})`)
    .join("\n");

  const direction = tx.amount > 0 ? "ÎNCASARE" : "CHELTUIALĂ";
  const text = transactionToEmbeddingText(tx);
  return [
    `Tranzacție: ${direction}`,
    `Sumă: ${Math.abs(tx.amount) / 100} ${tx.currency}`,
    `Descriere: ${text || "—"}`,
    "",
    "Categorii disponibile (id → nume):",
    catList,
    "",
    "Alege id-ul cel mai potrivit. Dacă nu ești suficient de sigur (<0.5), întoarce category_id null.",
  ].join("\n");
}
