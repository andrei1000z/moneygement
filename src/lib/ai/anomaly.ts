import "server-only";

import { generateText } from "ai";

import { getModel, hasAnyProvider } from "./providers";

export type Anomaly = {
  type:
    | "category_spike"
    | "unusual_amount"
    | "rare_merchant"
    | "balance_drop";
  category_id?: string;
  payee?: string;
  current: number;
  baseline: number;
  delta_pct: number;
  description?: string;
};

export type AnomalyInput = {
  category_id?: string | null;
  payee?: string | null;
  /** Suma în unități minore. */
  amount: number;
  occurred_on: string;
  /** Tag-uri pe tranzacție. Dacă oricare începe cu `trip_`, suprimăm anomalia
   * (BLUEPRINT §10 travel mode — cheltuielile în vacanță nu sunt anomalii). */
  tags?: string[] | null;
};

export type CategoryStats = {
  category_id: string;
  /** Mediană cheltuieli (absolut, minor units) ultimele 6 luni. */
  median_minor: number;
  /** MAD — Median Absolute Deviation pentru robustness. */
  mad_minor: number;
};

/**
 * Detectează anomalii statistice. Folosim z-score robust (MAD-based) pe
 * cheltuielile per-categorie ale ultimelor 6 luni. Threshold |z| > 3.5
 * → spike. Pentru merchanți rar întâlniți — tracked separat (necesită
 * istoric de cumpărături per merchant).
 *
 * Returnează lista de anomalii. NU apelează LLM — pure statistic.
 */
export function detectAnomalies(
  txs: AnomalyInput[],
  byCategory: Map<string, CategoryStats>,
): Anomaly[] {
  const out: Anomaly[] = [];

  for (const tx of txs) {
    if (!tx.category_id || tx.amount >= 0) continue; // doar cheltuieli categorisite
    // Travel mode: tx-uri cu tag `trip_*` nu sunt anomalii.
    if (tx.tags && tx.tags.some((t) => t.startsWith("trip_"))) continue;
    const stats = byCategory.get(tx.category_id);
    if (!stats || stats.mad_minor <= 0) continue;

    const absAmount = Math.abs(tx.amount);
    const zRobust = (absAmount - stats.median_minor) / (1.4826 * stats.mad_minor);

    if (zRobust > 3.5) {
      out.push({
        type: "unusual_amount",
        category_id: tx.category_id,
        payee: tx.payee ?? undefined,
        current: absAmount,
        baseline: stats.median_minor,
        delta_pct:
          stats.median_minor === 0
            ? 0
            : ((absAmount - stats.median_minor) / stats.median_minor) * 100,
      });
    }
  }

  return out;
}

/**
 * Adaugă o frază caldă/non-judgmental la fiecare anomalie via Groq
 * (rapid, ieftin). Best-effort; dacă AI-ul e jos, întoarce anomaliile
 * fără descriere.
 */
export async function describeAnomalies(
  anomalies: Anomaly[],
  categoryNames: Map<string, string>,
): Promise<Anomaly[]> {
  if (anomalies.length === 0 || !hasAnyProvider()) return anomalies;

  const out: Anomaly[] = [];
  for (const a of anomalies) {
    const catName = a.category_id ? categoryNames.get(a.category_id) : null;
    try {
      const { text } = await generateText({
        model: getModel("parse-fast"),
        system:
          "Ești asistentul Banii. Scrii o singură propoziție caldă, " +
          "non-judgmentală, în română cu diacritice, despre o anomalie " +
          "de spending. Nu inventa cifre. Lungime: max 25 cuvinte.",
        prompt:
          `Categoria "${catName ?? "—"}": tranzacția nouă ` +
          `${(a.current / 100).toFixed(2)} lei e ` +
          `${a.delta_pct.toFixed(0)}% peste mediana de ` +
          `${(a.baseline / 100).toFixed(2)} lei. Descrie blând.`,
      });
      out.push({ ...a, description: text.trim() });
    } catch {
      out.push(a);
    }
  }
  return out;
}
