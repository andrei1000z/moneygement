import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";

// Centralizăm acceptul la chei și modul de selectare al modelelor pentru
// ca rest-ul codului server-side să nu atingă direct `process.env`.
//
// Strategie:
//   parse-fast  → Groq Llama 3.3 70B (rapid, ieftin) pentru parsing
//   categorize  → Anthropic Sonnet 4.6 pentru tier 3 (acuratețe contează)
//   chat        → Anthropic Sonnet 4.6 (fallback Groq dacă Anthropic e jos)
//   embed       → OpenAI text-embedding-3-small (1536 dim, pgvector compatibil)
//   recap       → Anthropic Sonnet 4.6 (long-context summary calm-friend)
//   vision      → OpenAI gpt-4o-mini (cost optim pentru OCR receipt)

export const aiEnv = {
  anthropicKey: () => process.env.ANTHROPIC_API_KEY ?? "",
  openaiKey: () => process.env.OPENAI_API_KEY ?? "",
  groqKey: () => process.env.GROQ_API_KEY ?? "",
} as const;

export type ModelTask =
  | "parse-fast"
  | "categorize-fallback"
  | "chat"
  | "recap"
  | "vision"
  | "embed";

export function getAnthropicProvider() {
  return createAnthropic({ apiKey: aiEnv.anthropicKey() });
}
export function getOpenAIProvider() {
  return createOpenAI({ apiKey: aiEnv.openaiKey() });
}
export function getGroqProvider() {
  return createGroq({ apiKey: aiEnv.groqKey() });
}

/**
 * Returnează o instanță de model pregătită pentru task-ul cerut. Răspunde la
 * task-uri cu fallback când cheia primară nu e setată.
 */
export function getModel(task: Exclude<ModelTask, "embed">) {
  const hasAnthropic = aiEnv.anthropicKey().length > 0;
  const hasOpenAI = aiEnv.openaiKey().length > 0;
  const hasGroq = aiEnv.groqKey().length > 0;

  switch (task) {
    case "parse-fast":
      if (hasGroq) return getGroqProvider()("llama-3.3-70b-versatile");
      if (hasAnthropic) return getAnthropicProvider()("claude-sonnet-4-6");
      throw new Error("Niciun provider AI configurat (GROQ/ANTHROPIC).");

    case "categorize-fallback":
    case "chat":
    case "recap":
      if (hasAnthropic) return getAnthropicProvider()("claude-sonnet-4-6");
      if (hasGroq) return getGroqProvider()("llama-3.3-70b-versatile");
      throw new Error("Niciun provider AI configurat (ANTHROPIC/GROQ).");

    case "vision":
      if (hasOpenAI) return getOpenAIProvider()("gpt-4o-mini");
      if (hasAnthropic) return getAnthropicProvider()("claude-sonnet-4-6");
      throw new Error("Niciun provider AI vision (OPENAI/ANTHROPIC).");
  }
}

/**
 * Embedding model — separat pentru că tipurile diferă (embedding vs language).
 */
export function getEmbeddingModel() {
  if (!aiEnv.openaiKey()) {
    throw new Error("OPENAI_API_KEY necesar pentru embeddings.");
  }
  return getOpenAIProvider().textEmbeddingModel("text-embedding-3-small");
}

/**
 * Verifică dacă există minim un provider configurat. Folosit la UI pentru
 * a ascunde features dependente.
 */
export function hasAnyProvider(): boolean {
  return (
    aiEnv.anthropicKey().length > 0 ||
    aiEnv.openaiKey().length > 0 ||
    aiEnv.groqKey().length > 0
  );
}
