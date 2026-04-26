"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import {
  accountInputSchema,
  createAccount,
  updateAccount,
  type AccountInput,
} from "@/app/(dashboard)/accounts/actions";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { useInvalidateAccounts, type AccountRow } from "@/hooks/use-accounts";
import { fromMinor, SUPPORTED_CURRENCIES } from "@/lib/money";
import { cn } from "@/lib/utils";

import {
  ACCOUNT_COLORS,
  ACCOUNT_TYPE_META,
  ACCOUNT_TYPE_ORDER,
} from "./account-meta";

const PRESET_ICONS = [
  "💼",
  "💳",
  "🏦",
  "🐷",
  "👛",
  "📈",
  "📱",
  "🍽️",
  "🏠",
  "✈️",
  "🛒",
  "🎁",
] as const;

// Versiunea client a schemei: number pentru toate inputs (form data nu suportă bigint).
const formSchema = accountInputSchema;

type FormValues = z.infer<typeof formSchema>;

type Props = {
  account?: AccountRow | null;
  onDone?: () => void;
};

function maskIBAN(value: string) {
  const cleaned = value.replace(/\s+/g, "");
  if (cleaned.length <= 8) return cleaned.toUpperCase();
  const first = cleaned.slice(0, 4).toUpperCase();
  const last = cleaned.slice(-4).toUpperCase();
  const middle = "•".repeat(Math.min(cleaned.length - 8, 16));
  return `${first} ${middle} ${last}`;
}

export function AccountForm({ account, onDone }: Props) {
  const isEdit = !!account;
  const [pending, startTransition] = useTransition();
  const [ibanFocused, setIbanFocused] = useState(false);
  const invalidate = useInvalidateAccounts();

  const initialBalanceValue = account
    ? fromMinor(account.initial_balance, account.currency)
    : 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: account?.name ?? "",
      type: account?.type ?? "checking",
      currency: account?.currency ?? "RON",
      bank_name: account?.bank_name ?? "",
      iban: "",
      initial_balance: initialBalanceValue,
      color: account?.color ?? ACCOUNT_COLORS[0].value,
      icon: account?.icon ?? "🏦",
      is_shared: account?.is_shared ?? true,
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const input: AccountInput = values;
      const result = isEdit
        ? await updateAccount(account!.id, input)
        : await createAccount(input);
      if (!result.ok) {
        toast.error(
          isEdit ? "Nu am putut salva contul" : "Nu am putut crea contul",
          { description: result.error },
        );
        return;
      }
      toast.success(isEdit ? "Cont actualizat" : "Cont creat");
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
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nume</FormLabel>
              <FormControl>
                <Input
                  placeholder="ex: Cont BT, Revolut EUR"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tip</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACCOUNT_TYPE_ORDER.map((t) => {
                      const meta = ACCOUNT_TYPE_META[t];
                      return (
                        <SelectItem key={t} value={t}>
                          <span className="mr-2">{meta.icon}</span>
                          {meta.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monedă</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c === "RON" ? "RON · lei" : c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="bank_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bancă (opțional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="BT, ING, Revolut, BCR..."
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
          name="iban"
          render={({ field }) => (
            <FormItem>
              <FormLabel>IBAN (opțional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="RO49 AAAA 1B31 0075 9384 0000"
                  autoComplete="off"
                  inputMode="text"
                  spellCheck={false}
                  className="font-mono uppercase tracking-wide"
                  value={
                    ibanFocused || !field.value
                      ? (field.value ?? "")
                      : maskIBAN(field.value)
                  }
                  onChange={field.onChange}
                  onFocus={() => setIbanFocused(true)}
                  onBlur={() => setIbanFocused(false)}
                />
              </FormControl>
              <FormDescription>
                Stocat criptat în baza de date (pgcrypto + Vault). În UI
                afișăm doar ultimele 4 cifre.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="initial_balance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sold inițial</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0,00"
                  className="tabular-nums"
                  value={Number.isFinite(field.value) ? field.value : 0}
                  onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                />
              </FormControl>
              <FormDescription>
                Soldul curent va fi setat egal cu cel inițial. Tranzacțiile
                viitoare îl actualizează automat.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Culoare</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-2">
                  {ACCOUNT_COLORS.map((c) => {
                    const active = field.value === c.value;
                    return (
                      <button
                        type="button"
                        key={c.value}
                        aria-label={c.label}
                        aria-pressed={active}
                        onClick={() => field.onChange(c.value)}
                        className={cn(
                          "size-8 rounded-full border-2 transition",
                          active
                            ? "border-foreground scale-110"
                            : "border-transparent hover:scale-105",
                        )}
                        style={{ backgroundColor: c.value }}
                      />
                    );
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Iconiță</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ICONS.map((emoji) => {
                    const active = field.value === emoji;
                    return (
                      <button
                        type="button"
                        key={emoji}
                        aria-label={`Iconiță ${emoji}`}
                        aria-pressed={active}
                        onClick={() => field.onChange(emoji)}
                        className={cn(
                          "flex size-9 items-center justify-center rounded-lg border text-lg transition",
                          active
                            ? "border-foreground bg-accent"
                            : "border-border hover:bg-accent/50",
                        )}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_shared"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Cont partajat</FormLabel>
                <FormDescription>
                  Vizibil pentru toți membrii household-ului.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Se salvează…
            </>
          ) : isEdit ? (
            "Salvează modificările"
          ) : (
            "Crează contul"
          )}
        </Button>
      </form>
    </Form>
  );
}
