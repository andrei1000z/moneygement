"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import {
  createTransaction,
  type TransactionInput,
} from "@/app/(dashboard)/transactions/actions";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts, type AccountRow } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { usePresets, type PresetRow } from "@/hooks/use-presets";
import { useInvalidateTransactions } from "@/hooks/use-transactions";
import {
  clearDraft,
  loadDraft,
  loadMruAccount,
  saveDraft,
  saveMruAccount,
  useQuickAddStore,
  type QuickAddMode,
} from "@/stores/quick-add-store";
import { cn } from "@/lib/utils";

import { AccountPill } from "./account-pill";
import { bumpRecentCategory, CategoryGrid } from "./category-grid";
import { NumericKeypad } from "./numeric-keypad";
import { PresetBar } from "./preset-bar";
import { ReceiptCapture } from "./receipt-capture";
import { VoiceInput } from "./voice-input";

type Screen = 1 | 2;

function todayLocal(): string {
  return new Date().toISOString().slice(0, 10);
}

type DraftState = {
  mode: QuickAddMode;
  amountMinor: number;
  accountId: string | null;
  categoryId: string | null;
  occurredOn: string;
  payee: string;
  notes: string;
};

function emptyDraft(initialAccountId: string | null): DraftState {
  return {
    mode: "expense",
    amountMinor: 0,
    accountId: initialAccountId,
    categoryId: null,
    occurredOn: todayLocal(),
    payee: "",
    notes: "",
  };
}

export function QuickAddSheet() {
  const open = useQuickAddStore((s) => s.open);
  const closeSheet = useQuickAddStore((s) => s.closeSheet);
  const sheetMode = useQuickAddStore((s) => s.mode);
  const setSheetMode = useQuickAddStore((s) => s.setMode);
  const initialAccountId = useQuickAddStore((s) => s.initialAccountId);
  const receiptDraft = useQuickAddStore((s) => s.receiptDraft);
  const setReceiptDraft = useQuickAddStore((s) => s.setReceiptDraft);

  const { data: accounts } = useAccounts({ archived: false });
  const { data: categories } = useCategories();
  const { data: presets } = usePresets();
  const invalidate = useInvalidateTransactions();
  const [pending, startTransition] = useTransition();

  const [screen, setScreen] = useState<Screen>(1);
  const [draft, setDraft] = useState<DraftState>(() =>
    emptyDraft(initialAccountId),
  );
  const [askResume, setAskResume] = useState<DraftState | null>(null);

  const account = useMemo(
    () => (accounts ?? []).find((a) => a.id === draft.accountId),
    [accounts, draft.accountId],
  );

  // La deschidere: derived state cu ref-gate. Setarea în render e permisă
  // de regula `set-state-in-effect` cât timp e condiționată.
  const lastOpenRef = useRef(false);
  if (open && !lastOpenRef.current) {
    lastOpenRef.current = true;
    const stored = loadDraft();
    if (stored && stored.amountMinor > 0) {
      // setAskResume e queued; React batch-uiește.
      setAskResume(stored);
    }
    if (!draft.accountId) {
      const mru = loadMruAccount();
      const first = (accounts ?? [])[0]?.id ?? null;
      const candidate = initialAccountId ?? mru ?? first;
      if (candidate || draft.mode !== sheetMode) {
        setDraft((d) => ({
          ...d,
          mode: sheetMode,
          accountId: candidate ?? d.accountId,
        }));
      }
    } else if (draft.mode !== sheetMode) {
      setDraft((d) => ({ ...d, mode: sheetMode }));
    }
  } else if (!open && lastOpenRef.current) {
    lastOpenRef.current = false;
  }

  // Sync sheetMode din toggle → draft.mode (în render, condiționat).
  if (open && draft.mode !== sheetMode) {
    setDraft((d) => ({ ...d, mode: sheetMode }));
  }

  // Auto-save draft pe localStorage (debounced). Effect-ul este 100%
  // side-effect external — fără setState — deci e ok cu regula.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (draft.amountMinor > 0 || draft.payee.trim().length > 0) {
        saveDraft(draft);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [draft, open]);

  // Pre-populate din receipt — derived state cu ref-gate pe identitatea
  // ultimului receipt văzut.
  const lastReceiptRef = useRef(receiptDraft);
  if (receiptDraft && lastReceiptRef.current !== receiptDraft) {
    lastReceiptRef.current = receiptDraft;
    const captured = receiptDraft;
    setDraft((d) => ({
      ...d,
      mode: "expense",
      amountMinor: captured.total,
      payee: captured.merchant ?? d.payee,
      occurredOn: captured.date ?? d.occurredOn,
    }));
    setScreen(2);
    setReceiptDraft(null);
  }

  function applyPreset(p: PresetRow) {
    const next: DraftState = {
      ...draft,
      mode: "expense",
      amountMinor: p.amount,
      accountId: p.account_id ?? draft.accountId,
      categoryId: p.category_id ?? draft.categoryId,
      payee: p.label,
    };
    setDraft(next);
    // Submit instant — flow-ul de 1-tap.
    submit(next, { stayOpen: false });
  }

  function resetForm() {
    setDraft(emptyDraft(initialAccountId));
    setScreen(1);
    clearDraft();
  }

  function close() {
    if (draft.amountMinor === 0 && draft.payee.trim().length === 0) {
      clearDraft();
    }
    closeSheet();
    setScreen(1);
  }

  function submit(payload: DraftState, opts: { stayOpen: boolean }) {
    if (payload.amountMinor <= 0) {
      toast.error("Suma trebuie să fie > 0");
      return;
    }
    if (!payload.accountId) {
      toast.error("Selectează un cont");
      return;
    }
    const acc = (accounts ?? []).find((a) => a.id === payload.accountId);
    if (!acc) return;

    const sign = payload.mode === "income" ? 1 : -1;
    const input: TransactionInput = {
      account_id: payload.accountId,
      occurred_on: payload.occurredOn,
      amount: sign * payload.amountMinor,
      currency: acc.currency,
      payee: payload.payee.trim() || null,
      category_id: payload.categoryId,
      notes: payload.notes.trim() || null,
      ownership: "mine",
      status: "cleared",
      source: "manual",
    };

    startTransition(async () => {
      const r = await createTransaction(input);
      if (!r.ok) {
        toast.error("Salvare eșuată", { description: r.error });
        return;
      }
      saveMruAccount(payload.accountId!);
      if (payload.categoryId) bumpRecentCategory(payload.categoryId);
      clearDraft();
      await invalidate();
      toast.success("Tranzacție salvată");
      if (opts.stayOpen) {
        setDraft(emptyDraft(payload.accountId));
        setScreen(1);
      } else {
        resetForm();
        closeSheet();
      }
    });
  }

  return (
    <Drawer open={open} onOpenChange={(v) => (v ? null : close())}>
      <DrawerContent className="flex max-h-[92svh] flex-col p-0">
        {askResume ? (
          <ResumePrompt
            draft={askResume}
            onResume={(d) => {
              setDraft(d);
              setScreen(d.amountMinor > 0 ? 2 : 1);
              setAskResume(null);
            }}
            onDiscard={() => {
              clearDraft();
              setAskResume(null);
            }}
          />
        ) : (
          <>
            <DrawerHeader className="border-b">
              <div className="flex items-center justify-between gap-2">
                <DrawerTitle className="text-base">
                  {screen === 1
                    ? "Cât și de unde"
                    : "Detalii"}
                </DrawerTitle>
                <ModeToggle
                  mode={draft.mode}
                  onChange={(m) => {
                    setDraft((d) => ({ ...d, mode: m }));
                    setSheetMode(m);
                  }}
                />
              </div>
              <DrawerDescription className="sr-only">
                Adaugă rapid o tranzacție
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {screen === 1 ? (
                <Screen1
                  draft={draft}
                  setDraft={setDraft}
                  accounts={accounts ?? []}
                  presets={presets ?? []}
                  onPresetApply={applyPreset}
                  onAdvance={() => setScreen(2)}
                />
              ) : (
                <Screen2
                  draft={draft}
                  setDraft={setDraft}
                  account={account}
                  categories={categories ?? []}
                  householdId={
                    accounts?.[0]?.household_id ?? null
                  }
                  onReceiptResult={(d) => setReceiptDraft(d)}
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
              {screen === 2 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScreen(1)}
                  disabled={pending}
                >
                  <ArrowLeft className="size-4" aria-hidden /> Înapoi
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => submit(draft, { stayOpen: true })}
                  disabled={pending || draft.amountMinor === 0}
                >
                  Salvează & încă unul
                </Button>
                <Button
                  onClick={() => submit(draft, { stayOpen: false })}
                  disabled={pending || draft.amountMinor === 0}
                >
                  {pending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      …
                    </>
                  ) : (
                    <>
                      <Save className="size-4" aria-hidden /> Salvează
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

// ---------- Screen 1 ------------------------------------------------------
function Screen1({
  draft,
  setDraft,
  accounts,
  presets,
  onPresetApply,
  onAdvance,
}: {
  draft: DraftState;
  setDraft: React.Dispatch<React.SetStateAction<DraftState>>;
  accounts: AccountRow[];
  presets: PresetRow[];
  onPresetApply: (p: PresetRow) => void;
  onAdvance: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <AccountPill
          accounts={accounts}
          selectedId={draft.accountId}
          onSelect={(id) => setDraft((d) => ({ ...d, accountId: id }))}
        />
      </div>

      <PresetBar presets={presets} onApply={onPresetApply} />

      {/* Key forțează re-mount la reset (Salvează & încă unul). */}
      <NumericKeypad
        key={draft.amountMinor === 0 ? "reset" : "active"}
        defaultValue={draft.amountMinor}
        onChange={(m) => setDraft((d) => ({ ...d, amountMinor: m }))}
        onConfirm={onAdvance}
      />
    </div>
  );
}

// ---------- Screen 2 ------------------------------------------------------
function Screen2({
  draft,
  setDraft,
  account,
  categories,
  householdId,
  onReceiptResult,
}: {
  draft: DraftState;
  setDraft: React.Dispatch<React.SetStateAction<DraftState>>;
  account: AccountRow | undefined;
  categories: import("@/hooks/use-categories").CategoryRow[];
  householdId: string | null;
  onReceiptResult: (
    d: import("@/stores/quick-add-store").ReceiptDraft,
  ) => void;
}) {
  const isExpense = draft.mode === "expense";
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-muted-foreground text-xs uppercase tracking-wider">
          {draft.mode === "expense"
            ? "Cheltuială"
            : draft.mode === "income"
            ? "Venit"
            : "Transfer"}
        </p>
        <p className="text-3xl font-semibold tabular-nums">
          {(draft.amountMinor / 100).toFixed(2).replace(".", ",")}
          <span className="text-muted-foreground ml-1 text-sm font-medium">
            {account?.currency === "RON" ? "lei" : account?.currency ?? "RON"}
          </span>
        </p>
      </div>

      {draft.mode !== "transfer" ? (
        <CategoryGrid
          categories={categories}
          type={isExpense ? "expense" : "income"}
          selectedId={draft.categoryId}
          onSelect={(id) => setDraft((d) => ({ ...d, categoryId: id }))}
        />
      ) : null}

      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="qa-payee">
          La cine / sursa
        </label>
        <Input
          id="qa-payee"
          value={draft.payee}
          onChange={(e) => setDraft((d) => ({ ...d, payee: e.target.value }))}
          placeholder="ex: Lidl, Bolt, Salariu"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="qa-date">
          Data
        </label>
        <div className="flex gap-2">
          <Input
            id="qa-date"
            type="date"
            value={draft.occurredOn}
            onChange={(e) =>
              setDraft((d) => ({ ...d, occurredOn: e.target.value }))
            }
            max={todayLocal()}
            className="max-w-[180px]"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDraft((d) => ({ ...d, occurredOn: todayLocal() }))}
          >
            Azi
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              setDraft((s) => ({ ...s, occurredOn: d.toISOString().slice(0, 10) }));
            }}
          >
            Ieri
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium" htmlFor="qa-notes">
          Notițe
        </label>
        <Textarea
          id="qa-notes"
          rows={2}
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          placeholder="Detalii (opțional)"
        />
      </div>

      <div className="border-border/60 bg-muted/30 grid gap-3 rounded-xl border p-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium">📷 Bon</p>
          <ReceiptCapture
            householdId={householdId}
            onResult={onReceiptResult}
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium">🎤 Voce</p>
          <VoiceInput
            onResult={(r) => {
              setDraft((d) => ({
                ...d,
                amountMinor: r.amount && r.amount > 0 ? r.amount : d.amountMinor,
                payee: r.merchant ?? d.payee,
                categoryId: r.category_id ?? d.categoryId,
                occurredOn: r.date ?? d.occurredOn,
                notes: r.notes ?? d.notes,
              }));
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------- Resume prompt ------------------------------------------------
function ResumePrompt({
  draft,
  onResume,
  onDiscard,
}: {
  draft: DraftState;
  onResume: (d: DraftState) => void;
  onDiscard: () => void;
}) {
  return (
    <div className="space-y-4 px-6 py-8">
      <h3 className="text-lg font-semibold">Continuă draft-ul?</h3>
      <p className="text-muted-foreground text-sm">
        Aveai o tranzacție începută:{" "}
        <span className="font-medium">
          {(draft.amountMinor / 100).toFixed(2).replace(".", ",")} lei
        </span>
        {draft.payee ? ` la ${draft.payee}` : ""}.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => onResume(draft)} className="flex-1">
          Continuă
        </Button>
        <Button variant="outline" onClick={onDiscard} className="flex-1">
          Aruncă
        </Button>
      </div>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: QuickAddMode;
  onChange: (m: QuickAddMode) => void;
}) {
  const items: { value: QuickAddMode; label: string }[] = [
    { value: "expense", label: "−" },
    { value: "income", label: "+" },
    { value: "transfer", label: "↔" },
  ];
  return (
    <div className="bg-muted inline-flex rounded-md p-0.5">
      {items.map((i) => (
        <button
          key={i.value}
          type="button"
          onClick={() => onChange(i.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-sm font-semibold transition",
            mode === i.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}
