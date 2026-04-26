"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  bulkUpdate,
  setOwnership,
} from "@/app/(dashboard)/transactions/actions";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import {
  useInvalidateTransactions,
  useTransactionTotals,
  type TransactionFilters,
  type TransactionRow,
} from "@/hooks/use-transactions";
import { formatMoney } from "@/lib/money";

import { BulkActionBar } from "./bulk-action-bar";
import { TransactionDetail } from "./transaction-detail";
import { TransactionFiltersBar } from "./transaction-filters";
import { TransactionForm } from "./transaction-form";
import { TransactionList } from "./transaction-list";

function parseFiltersFromUrl(params: URLSearchParams): TransactionFilters {
  const arr = (key: string) =>
    params.get(key)?.split(",").filter(Boolean) ?? undefined;
  const num = (key: string) => {
    const v = params.get(key);
    return v && Number.isFinite(Number(v)) ? Number(v) : undefined;
  };
  return {
    search: params.get("q") || undefined,
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    accountIds: arr("accounts"),
    categoryIds: arr("categories"),
    amountMin: num("min"),
    amountMax: num("max"),
    tags: arr("tags"),
    status: arr("status") as TransactionFilters["status"],
    ownership: arr("owner") as TransactionFilters["ownership"],
  };
}

function filtersToUrl(filters: TransactionFilters): string {
  const sp = new URLSearchParams();
  if (filters.search) sp.set("q", filters.search);
  if (filters.from) sp.set("from", filters.from);
  if (filters.to) sp.set("to", filters.to);
  if (filters.accountIds?.length) sp.set("accounts", filters.accountIds.join(","));
  if (filters.categoryIds?.length)
    sp.set("categories", filters.categoryIds.join(","));
  if (filters.amountMin !== undefined) sp.set("min", String(filters.amountMin));
  if (filters.amountMax !== undefined) sp.set("max", String(filters.amountMax));
  if (filters.tags?.length) sp.set("tags", filters.tags.join(","));
  if (filters.status?.length) sp.set("status", filters.status.join(","));
  if (filters.ownership?.length) sp.set("owner", filters.ownership.join(","));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function TransactionsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => parseFiltersFromUrl(searchParams),
    [searchParams],
  );

  const { data: accounts } = useAccounts({ archived: false });
  const { data: categories } = useCategories();
  const totals = useTransactionTotals(filters);
  const invalidate = useInvalidateTransactions();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailOpenId, setDetailOpenId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const updateFilters = useCallback(
    (next: TransactionFilters) => {
      router.replace(`/transactions${filtersToUrl(next)}`, { scroll: false });
    },
    [router],
  );

  function handleTxClick(tx: TransactionRow) {
    setDetailOpenId(tx.id);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setSelectMode(false);
      return next;
    });
  }

  function startSelect(id: string) {
    setSelectMode(true);
    setSelectedIds(new Set([id]));
  }

  function clearSelect() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleSwipeAction(
    tx: TransactionRow,
    action: "categorize" | "hide" | "reviewed" | "tag",
  ) {
    if (action === "reviewed") {
      const r = await bulkUpdate([tx.id], { add_tags: ["reviewed"] });
      if (r.ok) {
        toast.success("Marcată ca revizuită");
        invalidate();
      } else {
        toast.error("Eroare", { description: r.error });
      }
    } else if (action === "hide") {
      const r = await setOwnership(tx.id, "yours");
      if (r.ok) {
        toast.success("Mutată la celălalt user");
        invalidate();
      } else {
        toast.error("Eroare", { description: r.error });
      }
    } else if (action === "tag" || action === "categorize") {
      // Deschide drawer-ul pentru editare detaliată.
      setDetailOpenId(tx.id);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 md:px-8 md:py-10">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
            Tranzacții
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Banii care intră și ies
          </h1>
        </div>
        <Button onClick={() => setSheetOpen(true)} className="shrink-0">
          <Plus className="size-4" aria-hidden /> Adaugă
        </Button>
      </header>

      <TransactionFiltersBar
        filters={filters}
        onChange={updateFilters}
        accounts={accounts ?? []}
        categories={categories ?? []}
      />

      <div className="grid grid-cols-3 gap-2">
        <TotalCard
          label="Venit"
          amount={totals.data?.income ?? 0}
          tone="positive"
        />
        <TotalCard
          label="Cheltuit"
          amount={totals.data?.expense ?? 0}
          tone="neutral"
        />
        <TotalCard
          label="Net"
          amount={totals.data?.net ?? 0}
          tone={
            (totals.data?.net ?? 0) >= 0 ? "positive" : "negative"
          }
        />
      </div>

      <TransactionList
        filters={filters}
        accounts={accounts ?? []}
        categories={categories ?? []}
        selectedIds={selectedIds}
        selectMode={selectMode}
        onTxClick={handleTxClick}
        onToggleSelect={toggleSelect}
        onLongPress={startSelect}
        onSwipeAction={handleSwipeAction}
      />

      {selectMode ? (
        <BulkActionBar
          ids={Array.from(selectedIds)}
          onClear={clearSelect}
          onSelectAll={() => {
            // Selectează tot ce e încărcat curent — simplificat.
            toast.info("Selectează rândurile vizibile cu long-press");
          }}
          totalVisible={selectedIds.size}
        />
      ) : null}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md"
        >
          <SheetHeader className="border-b">
            <SheetTitle>Adaugă tranzacție</SheetTitle>
            <SheetDescription>
              Pentru transferuri între conturi alege modul „Transfer”.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-5">
            {sheetOpen ? (
              <TransactionForm onDone={() => setSheetOpen(false)} />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <TransactionDetail
        txId={detailOpenId}
        open={!!detailOpenId}
        onOpenChange={(v) => setDetailOpenId(v ? detailOpenId : null)}
      />
    </div>
  );
}

function TotalCard({
  label,
  amount,
  tone,
}: {
  label: string;
  amount: number;
  tone: "positive" | "negative" | "neutral";
}) {
  const colorClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
      ? "text-destructive"
      : "text-foreground";
  return (
    <div className="border-border/60 bg-card/50 rounded-lg border px-3 py-2">
      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
        {label}
      </p>
      <p
        className={`text-base font-semibold tabular-nums ${colorClass}`}
        suppressHydrationWarning
      >
        {amount === 0 ? "—" : formatMoney(amount, "RON")}
      </p>
    </div>
  );
}
