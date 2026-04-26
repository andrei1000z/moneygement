// Edge Function process-embeddings — drain pe embedding_queue.
//
// Apelată la fiecare 5 minute de pg_cron (doar dacă coada are pending).
// Scoate până la 100 itemi, generează embedding-urile cu OpenAI, le
// scrie pe transactions.embedding și marchează queue.processed_at.
//
// Deploy: supabase functions deploy process-embeddings --no-verify-jwt

import { createClient } from "jsr:@supabase/supabase-js@2";

const BATCH = 96;
const MAX_DRAIN = 200;

Deno.serve(async (req: Request) => {
  const expected = Deno.env.get("CRON_SECRET");
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!expected || token !== expected) {
    return new Response("unauthorized", { status: 401 });
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    return new Response("missing_openai_key", { status: 503 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // 1) Scoate până la MAX_DRAIN itemi din coadă (cu detalii tx).
  const { data: queue, error: qErr } = await supabase
    .from("embedding_queue")
    .select(
      "id, transaction_id, attempts, transactions:transactions(id, payee, notes, tags)",
    )
    .is("processed_at", null)
    .order("enqueued_at", { ascending: true })
    .limit(MAX_DRAIN);

  if (qErr) {
    return new Response(JSON.stringify({ error: qErr.message }), {
      status: 500,
    });
  }
  if (!queue || queue.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2) Construiește textele.
  const items = queue.flatMap((q) => {
    const tx = (q as { transactions: unknown }).transactions as
      | { id: string; payee: string | null; notes: string | null; tags: string[] | null }
      | null;
    if (!tx) return [];
    const parts: string[] = [];
    if (tx.payee) parts.push(tx.payee);
    if (tx.notes) parts.push(tx.notes);
    if (tx.tags && tx.tags.length > 0) parts.push(`tags: ${tx.tags.join(", ")}`);
    const text = parts.join(" • ").slice(0, 1000);
    if (!text) return [];
    return [{
      queue_id: q.id as number,
      transaction_id: tx.id,
      text,
    }];
  });

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < items.length; i += BATCH) {
    const slice = items.slice(i, i + BATCH);
    try {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: slice.map((s) => s.text),
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        for (const s of slice) {
          await supabase
            .from("embedding_queue")
            .update({
              attempts: 1,
              error: `OpenAI HTTP ${res.status}: ${body.slice(0, 200)}`,
            })
            .eq("id", s.queue_id);
          errors++;
        }
        continue;
      }
      const json = (await res.json()) as {
        data: Array<{ embedding: number[]; index: number }>;
      };

      // Scrie embeddings pe tranzacții și marchează coada.
      for (const entry of json.data) {
        const item = slice[entry.index];
        if (!item) continue;
        const vec = `[${entry.embedding.join(",")}]`;
        const { error: upErr } = await supabase
          .from("transactions")
          .update({ embedding: vec })
          .eq("id", item.transaction_id);
        if (upErr) {
          await supabase
            .from("embedding_queue")
            .update({
              attempts: 1,
              error: `Update tx: ${upErr.message}`,
            })
            .eq("id", item.queue_id);
          errors++;
          continue;
        }
        await supabase
          .from("embedding_queue")
          .update({ processed_at: new Date().toISOString() })
          .eq("id", item.queue_id);
        processed++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      for (const s of slice) {
        await supabase
          .from("embedding_queue")
          .update({ attempts: 1, error: msg })
          .eq("id", s.queue_id);
        errors++;
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, processed, errors }), {
    headers: { "Content-Type": "application/json" },
  });
});
