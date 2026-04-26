"use client";

import { useMemo, useState } from "react";
import { Plus, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts, type AccountRow } from "@/hooks/use-accounts";
import { fromMinor, formatMoney } from "@/lib/money";

import { AccountCard } from "./account-card";
import { ACCOUNT_TYPE_META, ACCOUNT_TYPE_ORDER } from "./account-meta";
import { AccountSheet } from "./account-sheet";

type View = "active" | "archived";

export function AccountsScreen() {
  const [view, setView] = useState<View>("active");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const isArchived = view === "archived";

  const { data, isLoading, isError, error } = useAccounts({
    archived: isArchived,
  });

  const grouped = useMemo(() => groupByType(data ?? []), [data]);
  const totals = useMemo(
    () => sumByCurrency(data ?? []),
    [data],
  );

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(account: AccountRow) {
    setEditing(account);
    setSheetOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
              Conturi
            </p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Banii tăi, pe categorii
            </h1>
          </div>
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="size-4" aria-hidden /> Adaugă cont
          </Button>
        </div>

        {totals.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {totals.map((t) => (
              <div
                key={t.currency}
                className="border-border/60 bg-card/50 rounded-lg border px-3 py-1.5 text-xs"
              >
                <span className="text-muted-foreground mr-1.5">
                  Total {t.currency === "RON" ? "lei" : t.currency}:
                </span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(t.totalMinor, t.currency)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </header>

      <Tabs
        value={view}
        onValueChange={(v) => setView(v as View)}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Arhivate</TabsTrigger>
        </TabsList>

        <TabsContent value={view} className="space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-xl border p-6 text-sm">
              Nu am putut încărca conturile.
              <p className="text-muted-foreground mt-1 text-xs">
                {error instanceof Error ? error.message : String(error)}
              </p>
            </div>
          ) : (data ?? []).length === 0 ? (
            <EmptyState
              archived={isArchived}
              onCreate={openCreate}
            />
          ) : (
            ACCOUNT_TYPE_ORDER.filter((t) => grouped.get(t)?.length).map(
              (type) => {
                const list = grouped.get(type)!;
                const meta = ACCOUNT_TYPE_META[type];
                return (
                  <section key={type} className="space-y-2">
                    <h2 className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                      <span aria-hidden>{meta.icon}</span>
                      {meta.label}
                      <span className="text-muted-foreground/60 ml-1">
                        · {list.length}
                      </span>
                    </h2>
                    <div className="space-y-2">
                      {list.map((account) => (
                        <AccountCard
                          key={account.id}
                          account={account}
                          onEdit={openEdit}
                        />
                      ))}
                    </div>
                  </section>
                );
              },
            )
          )}
        </TabsContent>
      </Tabs>

      <AccountSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        account={editing}
      />
    </div>
  );
}

function EmptyState({
  archived,
  onCreate,
}: {
  archived: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="border-border/60 bg-card/40 flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
      <div className="bg-accent text-accent-foreground mb-4 flex size-12 items-center justify-center rounded-full">
        <Wallet className="size-5" aria-hidden />
      </div>
      <h3 className="text-base font-semibold">
        {archived ? "Niciun cont arhivat" : "Niciun cont încă"}
      </h3>
      <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
        {archived
          ? "Conturile arhivate apar aici, le poți reactiva oricând."
          : "Adaugă primul cont (curent, economii, numerar, tichete masă...) ca să începem."}
      </p>
      {!archived ? (
        <Button onClick={onCreate} className="mt-5">
          <Plus className="size-4" aria-hidden /> Adaugă primul cont
        </Button>
      ) : null}
    </div>
  );
}

function groupByType(accounts: AccountRow[]) {
  const map = new Map<AccountRow["type"], AccountRow[]>();
  for (const a of accounts) {
    const list = map.get(a.type) ?? [];
    list.push(a);
    map.set(a.type, list);
  }
  return map;
}

function sumByCurrency(accounts: AccountRow[]) {
  const totals = new Map<string, number>();
  for (const a of accounts) {
    if (a.archived_at) continue;
    totals.set(
      a.currency,
      (totals.get(a.currency) ?? 0) + fromMinor(a.current_balance, a.currency),
    );
  }
  return Array.from(totals.entries())
    .map(([currency, total]) => ({
      currency,
      totalMinor: Math.round(total * 100),
    }))
    .sort((a, b) =>
      a.currency === "RON" ? -1 : b.currency === "RON" ? 1 : a.currency.localeCompare(b.currency),
    );
}
