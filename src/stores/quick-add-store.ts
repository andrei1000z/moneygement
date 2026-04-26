"use client";

import { create } from "zustand";

export type QuickAddMode = "expense" | "income" | "transfer";

type State = {
  open: boolean;
  mode: QuickAddMode;
  /** Account preselectat la deschidere (din MRU). */
  initialAccountId: string | null;
  /** Setat la deschidere prin scan-receipt. */
  receiptDraft: ReceiptDraft | null;
};

type Actions = {
  openSheet: (opts?: { mode?: QuickAddMode; accountId?: string }) => void;
  closeSheet: () => void;
  setMode: (mode: QuickAddMode) => void;
  setReceiptDraft: (draft: ReceiptDraft | null) => void;
};

export type ReceiptDraft = {
  merchant: string | null;
  total: number; // minor units
  currency: string;
  date: string | null; // YYYY-MM-DD
  storage_path: string | null;
  line_items: Array<{
    description: string;
    amount: number; // minor units
    suggested_category_id: string | null;
  }>;
};

export const useQuickAddStore = create<State & Actions>()((set) => ({
  open: false,
  mode: "expense",
  initialAccountId: null,
  receiptDraft: null,
  openSheet: (opts) =>
    set((s) => ({
      open: true,
      mode: opts?.mode ?? s.mode,
      initialAccountId: opts?.accountId ?? s.initialAccountId,
    })),
  closeSheet: () => set({ open: false, receiptDraft: null }),
  setMode: (mode) => set({ mode }),
  setReceiptDraft: (receiptDraft) => set({ receiptDraft }),
}));

// ---------- localStorage draft persistence ------------------------------
const DRAFT_KEY = "banii.quickadd.draft";

export type QuickAddDraft = {
  mode: QuickAddMode;
  amountMinor: number;
  accountId: string | null;
  categoryId: string | null;
  occurredOn: string; // YYYY-MM-DD
  payee: string;
  notes: string;
  /** epoch ms — pentru a expira draft-uri vechi (>24h). */
  savedAt: number;
};

export function loadDraft(): QuickAddDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuickAddDraft;
    if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Omit<QuickAddDraft, "savedAt">) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({ ...draft, savedAt: Date.now() }),
  );
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
}

// ---------- Most-recently-used account ----------------------------------
const MRU_ACCOUNT_KEY = "banii.quickadd.lastAccount";

export function loadMruAccount(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(MRU_ACCOUNT_KEY);
}

export function saveMruAccount(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MRU_ACCOUNT_KEY, id);
}
