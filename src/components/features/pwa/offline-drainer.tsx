"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { drainPending, listPending } from "@/lib/offline/queue";

/**
 * Drain pe `online` event — face flush la coada IndexedDB cu acțiuni
 * pending. Apelantul trebuie să furnizeze un endpoint sau handler
 * pentru fiecare item.
 *
 * Pentru moment trimitem la /api/transactions/replay (placeholder pe
 * care îl vom implementa la nevoie). Dacă endpoint-ul nu există,
 * itemul e re-încercat la următorul `online`.
 */
export function OfflineDrainer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    async function drain() {
      const pending = await listPending();
      if (pending.length === 0) return;

      const result = await drainPending(async (payload) => {
        const res = await fetch("/api/transactions/replay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
      if (result.flushed > 0) {
        toast.success(`${result.flushed} tranzacții sincronizate offline.`);
      }
    }

    function onOnline() {
      void drain();
    }

    window.addEventListener("online", onOnline);
    if (navigator.onLine) void drain();
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}
