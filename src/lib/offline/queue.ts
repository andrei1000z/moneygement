"use client";

// Offline queue pentru tranzacții. Stochează în IndexedDB acțiunile
// inițiate offline; le drain-uim la `online` event sau Background Sync
// (Android).

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

const DB_NAME = "banii-offline";
const DB_VERSION = 1;

export type PendingTransaction = {
  id: string; // UUID local
  payload: unknown; // serializat — TransactionInput de la actions.ts
  enqueued_at: number;
  attempts: number;
};

interface BaniiDb extends DBSchema {
  pending_transactions: {
    key: string;
    value: PendingTransaction;
    indexes: { "by-enqueued": number };
  };
}

let dbPromise: Promise<IDBPDatabase<BaniiDb>> | null = null;

function getDb(): Promise<IDBPDatabase<BaniiDb>> {
  if (!dbPromise) {
    dbPromise = openDB<BaniiDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("pending_transactions")) {
          const store = db.createObjectStore("pending_transactions", {
            keyPath: "id",
          });
          store.createIndex("by-enqueued", "enqueued_at");
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueTransaction(
  payload: unknown,
): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.add("pending_transactions", {
    id,
    payload,
    enqueued_at: Date.now(),
    attempts: 0,
  });
  return id;
}

export async function listPending(): Promise<PendingTransaction[]> {
  const db = await getDb();
  return db.getAllFromIndex("pending_transactions", "by-enqueued");
}

export async function removePending(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("pending_transactions", id);
}

export async function incrementAttempts(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("pending_transactions", "readwrite");
  const item = await tx.store.get(id);
  if (item) {
    item.attempts += 1;
    await tx.store.put(item);
  }
  await tx.done;
}

export async function clearAll(): Promise<void> {
  const db = await getDb();
  await db.clear("pending_transactions");
}

/**
 * Drain — încearcă să trimită fiecare item pending la endpoint-ul dat.
 * Apelează `flush(payload)` pentru fiecare; dacă promise-ul resolve,
 * șterge din coadă.
 *
 * Apelat la `online` event (vezi `useOfflineDrain`).
 */
export async function drainPending<T>(
  flush: (payload: unknown) => Promise<T>,
): Promise<{ flushed: number; failed: number }> {
  const items = await listPending();
  let flushed = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await flush(item.payload);
      await removePending(item.id);
      flushed++;
    } catch {
      await incrementAttempts(item.id);
      failed++;
      // Drop după 5 încercări — userul nu va mai vedea progresul.
      if (item.attempts + 1 >= 5) {
        await removePending(item.id);
      }
    }
  }
  return { flushed, failed };
}
