import "server-only";

import { embed, embedMany } from "ai";

import { getEmbeddingModel } from "./providers";

const BATCH_SIZE = 96; // OpenAI permite până la 2048; ne menținem rezonabili.

export type EmbeddingInput = {
  payee?: string | null;
  notes?: string | null;
  tags?: string[] | null;
};

/**
 * Compune textul folosit pentru embedding dintr-o tranzacție.
 * Concatenăm payee + notes + tags într-un format consistent.
 */
export function transactionToEmbeddingText(tx: EmbeddingInput): string {
  const parts: string[] = [];
  if (tx.payee?.trim()) parts.push(tx.payee.trim());
  if (tx.notes?.trim()) parts.push(tx.notes.trim());
  if (tx.tags && tx.tags.length > 0)
    parts.push(`tags: ${tx.tags.join(", ")}`);
  return parts.join(" • ").slice(0, 1000);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: text,
  });
  return embedding;
}

/**
 * Batch embeddings — folosit la backfill sau la procesarea cozii. OpenAI
 * acceptă până la 2048 inputs/cerere; folosim 96 pentru stabilitate.
 */
export async function generateEmbeddings(
  texts: string[],
): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE);
    const { embeddings } = await embedMany({
      model: getEmbeddingModel(),
      values: slice,
    });
    out.push(...embeddings);
  }
  return out;
}

/**
 * Format pentru pgvector — string `[v1,v2,...]`.
 */
export function toPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
