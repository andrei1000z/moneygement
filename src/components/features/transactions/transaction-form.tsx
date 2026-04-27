"use client";

import { useEffect, useMemo, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import {
  createTransaction,
  updateTransaction,
} from "@/app/(dashboard)/transactions/actions";
import type { TransactionInput } from "@/lib/validation/transactions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import {
  useInvalidateTransactions,
  type TransactionRow,
} from "@/hooks/use-transactions";
import { cn } from "@/lib/utils";
import type { CategoryType, Ownership, TxStatus } from "@/types/database";

type Mode = "expense" | "income" | "transfer";

const formSchema = z.object({
  mode: z.enum(["expense", "income", "transfer"]),
  account_id: z.string().uuid("Selectează un cont"),
  /** Pentru transfer: contul destinatar. */
  to_account_id: z.string().uuid().nullable().optional(),
  /** Suma absolută în unități MINORE (≥ 0). Semnul aplicat după mode. */
  amount_abs: z.number().int().nonnegative(),
  occurred_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data trebuie să fie YYYY-MM-DD"),
  payee: z.string().trim().max(120).optional(),
  category_id: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(500).optional(),
  tags_text: z.string().optional(),
  ownership: z.enum(["mine", "yours", "shared"]),
  status: z.enum(["cleared", "pending", "scheduled"]),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  transaction?: TransactionRow | null;
  onDone?: () => void;
};

function todayLocal(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(yyyymmdd: string, days: number): string {
  const d = new Date(yyyymmdd + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function deriveMode(t: TransactionRow | null | undefined): Mode {
  if (!t) return "expense";
  if (t.is_transfer) return "transfer";
  return t.amount >= 0 ? "income" : "expense";
}

export function TransactionForm({ transaction, onDone }: Props) {
  const isEdit = !!transaction;
  const [pending, startTransition] = useTransition();
  const invalidate = useInvalidateTransactions();
  const { data: accounts } = useAccounts({ archived: false });
  const { data: categoriesAll } = useCategories();

  const initialMode = deriveMode(transaction);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: initialMode,
      account_id: transaction?.account_id ?? "",
      to_account_id: null,
      amount_abs: transaction
        ? Math.abs(transaction.amount)
        : 0,
      occurred_on: transaction?.occurred_on ?? todayLocal(),
      payee: transaction?.payee ?? "",
      category_id: transaction?.category_id ?? null,
      notes: transaction?.notes ?? "",
      tags_text: (transaction?.tags ?? []).join(", "),
      ownership: (transaction?.ownership ?? "mine") as Ownership,
      status: (transaction?.status === "void"
        ? "cleared"
        : transaction?.status ?? "cleared") as Exclude<TxStatus, "void">,
    },
  });

  const mode = form.watch("mode");
  const accountId = form.watch("account_id");
  const account = useMemo(
    () => (accounts ?? []).find((a) => a.id === accountId),
    [accounts, accountId],
  );

  // Filtrează categoriile după mode (transfer = niciuna).
  const filteredCategories = useMemo(() => {
    if (mode === "transfer") return [];
    const wanted: CategoryType = mode;
    return (categoriesAll ?? []).filter((c) => c.type === wanted);
  }, [categoriesAll, mode]);

  // Default cont la primul activ când nu e setat (only on mount).
  useEffect(() => {
    if (!accountId && (accounts ?? []).length > 0) {
      form.setValue("account_id", accounts![0]!.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      if (!account) {
        toast.error("Selectează un cont");
        return;
      }
      const tags = (values.tags_text ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .slice(0, 20);

      if (values.mode === "transfer") {
        if (!values.to_account_id) {
          toast.error("Selectează contul destinatar");
          return;
        }
        if (values.to_account_id === values.account_id) {
          toast.error("Contul destinatar trebuie să difere");
          return;
        }
        const toAccount = (accounts ?? []).find(
          (a) => a.id === values.to_account_id,
        );
        if (!toAccount) {
          toast.error("Contul destinatar nu există");
          return;
        }

        // Inserăm două tranzacții — trigger-ul fn_detect_transfer le-ar
        // putea lega automat, dar pentru manual setăm explicit
        // is_transfer + transfer_pair_id după inserare. Aici facem
        // simplu: marcăm ambele cu source='transfer' (skip-uind
        // detect-ul), apoi linkTransfer le leagă.
        const outgoing: TransactionInput = {
          account_id: values.account_id,
          occurred_on: values.occurred_on,
          amount: -values.amount_abs,
          currency: account.currency,
          payee: `Transfer → ${toAccount.name}`,
          notes: values.notes ?? null,
          tags,
          status: values.status,
          ownership: values.ownership,
          source: "transfer",
          is_transfer: true,
        };
        const incoming: TransactionInput = {
          account_id: values.to_account_id,
          occurred_on: values.occurred_on,
          amount: values.amount_abs,
          currency: toAccount.currency,
          payee: `Transfer ← ${account.name}`,
          notes: values.notes ?? null,
          tags,
          status: values.status,
          ownership: values.ownership,
          source: "transfer",
          is_transfer: true,
        };
        const r1 = await createTransaction(outgoing);
        if (!r1.ok) {
          toast.error("Eroare transfer", { description: r1.error });
          return;
        }
        const r2 = await createTransaction(incoming);
        if (!r2.ok) {
          toast.error("Eroare transfer (a doua latură)", {
            description: r2.error,
          });
          return;
        }
        // Legare bidirecțională.
        const { linkTransfer } = await import(
          "@/app/(dashboard)/transactions/actions"
        );
        await linkTransfer(r1.data.id, r2.data.id);
        toast.success("Transfer înregistrat");
        await invalidate();
        onDone?.();
        return;
      }

      const sign = values.mode === "income" ? 1 : -1;
      const input: TransactionInput = {
        account_id: values.account_id,
        occurred_on: values.occurred_on,
        amount: sign * values.amount_abs,
        currency: account.currency,
        payee: values.payee ?? null,
        category_id: values.category_id ?? null,
        notes: values.notes ?? null,
        tags,
        status: values.status,
        ownership: values.ownership,
        source: "manual",
      };
      const result = isEdit
        ? await updateTransaction(transaction!.id, input)
        : await createTransaction(input);
      if (!result.ok) {
        toast.error(
          isEdit
            ? "Nu am putut salva tranzacția"
            : "Nu am putut crea tranzacția",
          { description: result.error },
        );
        return;
      }
      toast.success(isEdit ? "Tranzacție actualizată" : "Tranzacție creată");
      await invalidate();
      onDone?.();
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        {/* Mode segmented control */}
        <FormField
          control={form.control}
          name="mode"
          render={({ field }) => (
            <FormItem>
              <div className="bg-muted inline-flex w-full rounded-lg p-1">
                {(
                  [
                    { value: "expense", label: "Cheltuială" },
                    { value: "income", label: "Venit" },
                    { value: "transfer", label: "Transfer" },
                  ] as const
                ).map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => field.onChange(opt.value)}
                    className={cn(
                      "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition",
                      field.value === opt.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amount */}
        <FormField
          control={form.control}
          name="amount_abs"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sumă</FormLabel>
              <FormControl>
                <CurrencyInput
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? 0)}
                  currency={account?.currency ?? "RON"}
                  placeholder="0,00"
                  allowNegative={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Account(s) */}
        {mode === "transfer" ? (
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Din contul</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(accounts ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.icon ? `${a.icon} ` : ""}
                          {a.name}
                          <span className="text-muted-foreground ml-1 text-xs">
                            {a.currency}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="to_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>În contul</FormLabel>
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={(v) => field.onChange(v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(accounts ?? [])
                        .filter((a) => a.id !== accountId)
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.icon ? `${a.icon} ` : ""}
                            {a.name}
                            <span className="text-muted-foreground ml-1 text-xs">
                              {a.currency}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : (
          <FormField
            control={form.control}
            name="account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cont</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selectează" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(accounts ?? []).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.icon ? `${a.icon} ` : ""}
                        {a.name}
                        <span className="text-muted-foreground ml-1 text-xs">
                          {a.currency}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Date with shortcuts */}
        <FormField
          control={form.control}
          name="occurred_on"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="date"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    max={todayLocal()}
                    className="max-w-[170px]"
                  />
                  <div className="flex gap-1">
                    {(
                      [
                        { label: "Azi", days: 0 },
                        { label: "Ieri", days: -1 },
                        { label: "Acum 2 zile", days: -2 },
                      ] as const
                    ).map((s) => (
                      <Button
                        key={s.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          field.onChange(shiftDate(todayLocal(), s.days))
                        }
                      >
                        {s.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Payee + Category (skip pentru transfer) */}
        {mode !== "transfer" ? (
          <>
            <FormField
              control={form.control}
              name="payee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>La cine / sursa</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ex: Lidl, Salariu, Bolt"
                      autoComplete="off"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorie</FormLabel>
                  <Select
                    value={field.value ?? "__none__"}
                    onValueChange={(v) =>
                      field.onChange(v === "__none__" ? null : v)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Fără categorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">— necategorisit</SelectItem>
                      {filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.icon ? `${c.icon} ` : ""}
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : null}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notițe</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Detalii, context, ceva ce ai vrea să-ți amintești"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tag-uri</FormLabel>
              <FormControl>
                <Input
                  placeholder="separate prin virgulă: vacanta, copii"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                Multiple tag-uri pentru filtrare rapidă (vacanta, urgent...).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="ownership"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apartenență</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="mine">👤 A mea</SelectItem>
                    <SelectItem value="shared">👥 Comună</SelectItem>
                    <SelectItem value="yours">🤝 A celuilalt</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cleared">Confirmată</SelectItem>
                    <SelectItem value="pending">În așteptare</SelectItem>
                    <SelectItem value="scheduled">Programată</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Se salvează…
            </>
          ) : isEdit ? (
            "Salvează modificările"
          ) : (
            "Crează tranzacția"
          )}
        </Button>
      </form>
    </Form>
  );
}
