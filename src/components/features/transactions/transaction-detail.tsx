"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import {
  ArrowLeftRight,
  Copy,
  ExternalLink,
  Pencil,
  Scissors,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  addComment,
  createRuleFromCorrection,
  createTransaction,
  deleteTransaction,
} from "@/app/(dashboard)/transactions/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import {
  useInvalidateTransactions,
  useTransaction,
  useTransactionComments,
} from "@/hooks/use-transactions";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import { SplitModal } from "./split-modal";
import { TransactionForm } from "./transaction-form";

type Props = {
  txId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type View = "view" | "edit" | "split";

export function TransactionDetail({ txId, open, onOpenChange }: Props) {
  const [view, setView] = useState<View>("view");
  const [pending, startTransition] = useTransition();
  const invalidate = useInvalidateTransactions();
  const { data: tx, isLoading } = useTransaction(open ? txId : null);
  const { data: comments } = useTransactionComments(open ? txId : null);
  const { data: accounts } = useAccounts({ archived: false });
  const { data: categories } = useCategories();
  const [commentText, setCommentText] = useState("");
  const [previousCategoryId, setPreviousCategoryId] = useState<
    string | null
  >(null);

  const account = (accounts ?? []).find((a) => a.id === tx?.account_id);
  const category = (categories ?? []).find((c) => c.id === tx?.category_id);
  const pairAccount =
    tx?.is_transfer && tx.transfer_pair_id
      ? (accounts ?? []).find((a) => a.id !== tx.account_id)
      : undefined;

  function close() {
    setView("view");
    onOpenChange(false);
  }

  function handleDelete() {
    if (!tx) return;
    startTransition(async () => {
      const r = await deleteTransaction(tx.id);
      if (!r.ok) {
        toast.error("Ștergere eșuată", { description: r.error });
        return;
      }
      toast.success("Tranzacție ștearsă");
      await invalidate();
      close();
    });
  }

  function handleDuplicate() {
    if (!tx) return;
    startTransition(async () => {
      const r = await createTransaction({
        account_id: tx.account_id,
        occurred_on: tx.occurred_on,
        amount: tx.amount,
        currency: tx.currency,
        payee: tx.payee,
        category_id: tx.category_id,
        notes: tx.notes,
        tags: tx.tags ?? [],
        ownership: tx.ownership,
        status: tx.status === "void" ? "cleared" : tx.status,
        source: "manual",
      });
      if (!r.ok) {
        toast.error("Duplicare eșuată", { description: r.error });
        return;
      }
      toast.success("Duplicat creat");
      await invalidate();
    });
  }

  function handleSendComment() {
    if (!tx || commentText.trim().length === 0) return;
    startTransition(async () => {
      const r = await addComment(tx.id, commentText);
      if (!r.ok) {
        toast.error("Comentariu netrimis", { description: r.error });
        return;
      }
      setCommentText("");
      await invalidate();
    });
  }

  return (
    <>
      <Drawer open={open && view !== "split"} onOpenChange={(v) => (v ? null : close())}>
        <DrawerContent className="max-h-[90svh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>
              {view === "edit" ? "Editează tranzacția" : "Detalii tranzacție"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            {isLoading || !tx ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
              </div>
            ) : view === "edit" ? (
              <TransactionForm
                transaction={tx}
                onDone={() => {
                  setView("view");
                  invalidate();
                  // Detect category change → propune extragere regulă.
                  const newCategory = tx.category_id ?? null;
                  const old = previousCategoryId;
                  setPreviousCategoryId(null);
                  if (
                    newCategory &&
                    old !== newCategory &&
                    tx.payee &&
                    tx.payee.trim().length > 1
                  ) {
                    const newCatName =
                      (categories ?? []).find((c) => c.id === newCategory)
                        ?.name ?? "categorie";
                    const payeeLabel = tx.payee;
                    toast(
                      `Crează regulă: toate de la „${payeeLabel}" → ${newCatName}?`,
                      {
                        duration: 8000,
                        action: {
                          label: "Da",
                          onClick: () => {
                            startTransition(async () => {
                              const r = await createRuleFromCorrection({
                                payee: payeeLabel,
                                category_id: newCategory,
                              });
                              if (!r.ok) {
                                toast.error(r.error);
                              } else {
                                toast.success("Regulă creată");
                              }
                            });
                          },
                        },
                      },
                    );
                  }
                }}
              />
            ) : (
              <div className="space-y-5">
                {/* Hero */}
                <div className="text-center">
                  <div
                    className={cn(
                      "text-3xl font-semibold tabular-nums",
                      tx.amount > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-foreground",
                    )}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {formatMoney(tx.amount, tx.currency)}
                  </div>
                  <p className="text-foreground mt-2 text-base font-medium">
                    {tx.payee ?? "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                    {category ? (
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: category.color
                            ? `${category.color}20`
                            : undefined,
                        }}
                      >
                        {category.icon ? `${category.icon} ` : ""}
                        {category.name}
                      </Badge>
                    ) : null}
                    {tx.is_transfer ? (
                      <Badge variant="outline" className="gap-1">
                        <ArrowLeftRight className="size-3" aria-hidden />
                        Transfer
                      </Badge>
                    ) : null}
                    {tx.status === "pending" ? (
                      <Badge variant="outline">În așteptare</Badge>
                    ) : null}
                    {tx.status === "void" ? (
                      <Badge variant="outline">Anulată (split)</Badge>
                    ) : null}
                  </div>
                </div>

                {/* Metadata */}
                <dl className="glass-thin divide-y divide-[--glass-border] rounded-[--radius-card] text-sm">
                  <Meta label="Cont" value={account?.name ?? "—"} />
                  <Meta
                    label="Data"
                    value={format(parseISO(tx.occurred_on), "EEEE, d MMM yyyy", {
                      locale: ro,
                    })}
                  />
                  <Meta
                    label="Apartenență"
                    value={
                      tx.ownership === "mine"
                        ? "👤 A mea"
                        : tx.ownership === "yours"
                        ? "🤝 A celuilalt"
                        : "👥 Comună"
                    }
                  />
                  <Meta
                    label="Sursă"
                    value={
                      {
                        manual: "Manual",
                        import: "Import CSV",
                        bank_sync: "Sync bancă",
                        recurring: "Recurent",
                        transfer: "Transfer",
                      }[tx.source]
                    }
                  />
                  {tx.tags && tx.tags.length > 0 ? (
                    <Meta
                      label="Tag-uri"
                      value={tx.tags.map((t) => `#${t}`).join(" ")}
                    />
                  ) : null}
                  {tx.notes ? <Meta label="Notițe" value={tx.notes} /> : null}
                  {tx.external_id ? (
                    <Meta label="ID extern" value={tx.external_id} />
                  ) : null}
                </dl>

                {pairAccount ? (
                  <div className="border-border/60 bg-muted/40 flex items-center gap-3 rounded-xl border p-3">
                    <ArrowLeftRight className="size-4" aria-hidden />
                    <span className="text-sm">
                      Pereche cu cont:{" "}
                      <strong>{pairAccount.name}</strong>
                    </span>
                  </div>
                ) : null}

                {tx.receipt_url ? (
                  <a
                    href={tx.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-thin hover:bg-[oklch(from_var(--foreground)_l_c_h/0.04)] flex items-center justify-between rounded-xl border p-3 text-sm"
                  >
                    📷 Vezi bon
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                ) : null}

                {/* Comments */}
                <section className="space-y-3">
                  <h3 className="text-sm font-medium">Comentarii</h3>
                  <ul className="space-y-2">
                    {(comments ?? []).map((c) => (
                      <li
                        key={c.id}
                        className="glass-thin rounded-xl p-3 text-sm"
                      >
                        <p>{c.body}</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {format(parseISO(c.created_at), "d MMM, HH:mm", {
                            locale: ro,
                          })}
                          {c.emoji ? ` · ${c.emoji}` : ""}
                        </p>
                      </li>
                    ))}
                    {(comments ?? []).length === 0 ? (
                      <li className="text-muted-foreground text-xs">
                        Niciun comentariu încă.
                      </li>
                    ) : null}
                  </ul>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Scrie un comentariu…"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendComment();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      onClick={handleSendComment}
                      disabled={pending || commentText.trim().length === 0}
                      aria-label="Trimite comentariu"
                    >
                      <Send className="size-4" aria-hidden />
                    </Button>
                  </div>
                </section>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviousCategoryId(tx.category_id ?? null);
                      setView("edit");
                    }}
                  >
                    <Pencil className="size-4" aria-hidden /> Editează
                  </Button>
                  {!tx.is_transfer && tx.status !== "void" ? (
                    <Button
                      variant="outline"
                      onClick={() => setView("split")}
                    >
                      <Scissors className="size-4" aria-hidden /> Split
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={handleDuplicate}
                    disabled={pending}
                  >
                    <Copy className="size-4" aria-hidden /> Duplică
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={pending}>
                        <Trash2 className="size-4" aria-hidden /> Șterge
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Ștergi tranzacția?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Soldul contului se recalculează automat. Acțiunea
                          nu poate fi anulată.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Renunță</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>
                          Șterge
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {tx ? (
        <SplitModal
          open={view === "split"}
          onOpenChange={(v) => setView(v ? "split" : "view")}
          transaction={tx}
          onDone={() => {
            setView("view");
            invalidate();
          }}
        />
      ) : null}
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-right text-sm">{value}</dd>
    </div>
  );
}
