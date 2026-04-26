"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import {
  categoryInputSchema,
  createCategory,
  updateCategory,
  type CategoryInput,
} from "@/app/(dashboard)/categories/actions";
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
import {
  type CategoryRow,
  useCategories,
  useInvalidateCategories,
} from "@/hooks/use-categories";
import { fromMinor, SUPPORTED_CURRENCIES } from "@/lib/money";
import type { CategoryType } from "@/types/database";

const CATEGORY_ICONS = [
  "🛒",
  "🥡",
  "🍽️",
  "🚌",
  "⛽",
  "💡",
  "📶",
  "🔁",
  "💊",
  "🛍️",
  "📚",
  "🧾",
  "🏠",
  "👨‍👩‍👧",
  "🎁",
  "✈️",
  "🎨",
  "💅",
  "🏋️",
  "🛡️",
  "💵",
  "💼",
  "🎟️",
  "👵",
  "🔀",
] as const;

const formSchema = categoryInputSchema;
type FormValues = z.infer<typeof formSchema>;

type Props = {
  category?: CategoryRow | null;
  defaultType?: CategoryType;
  onDone?: () => void;
};

export function CategoryForm({ category, defaultType, onDone }: Props) {
  const isEdit = !!category;
  const [pending, startTransition] = useTransition();
  const invalidate = useInvalidateCategories();
  const initialType = category?.type ?? defaultType ?? "expense";

  const { data: categories } = useCategories({ type: initialType });
  const parents = (categories ?? []).filter(
    (c) =>
      c.parent_id === null && (!category || c.id !== category.id),
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: category?.name ?? "",
      type: initialType,
      parent_id: category?.parent_id ?? null,
      icon: category?.icon ?? "🛒",
      color: category?.color ?? null,
      budget_amount: category?.budget_amount
        ? fromMinor(category.budget_amount, "RON")
        : null,
      budget_currency: "RON",
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const input: CategoryInput = {
        ...values,
        parent_id: values.parent_id || null,
      };
      const result = isEdit
        ? await updateCategory(category!.id, input)
        : await createCategory(input);
      if (!result.ok) {
        toast.error(
          isEdit
            ? "Nu am putut salva categoria"
            : "Nu am putut crea categoria",
          { description: result.error },
        );
        return;
      }
      toast.success(isEdit ? "Categorie actualizată" : "Categorie creată");
      await invalidate();
      onDone?.();
    });
  }

  const lockType = !!category?.is_system;

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
                  placeholder="ex: Lidl, Spotify, Bonus"
                  autoComplete="off"
                  disabled={lockType}
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
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={lockType}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="expense">Cheltuieli</SelectItem>
                    <SelectItem value="income">Venituri</SelectItem>
                    <SelectItem value="transfer">Transferuri</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="parent_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Părinte (opțional)</FormLabel>
                <Select
                  value={field.value ?? "__root__"}
                  onValueChange={(v) =>
                    field.onChange(v === "__root__" ? null : v)
                  }
                  disabled={lockType}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Categorie de top" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__root__">— niciuna (top level)</SelectItem>
                    {parents.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.icon ? `${p.icon} ` : ""}
                        {p.name}
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
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Iconiță</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_ICONS.map((emoji) => {
                    const active = field.value === emoji;
                    return (
                      <button
                        type="button"
                        key={emoji}
                        aria-pressed={active}
                        onClick={() => field.onChange(emoji)}
                        className={
                          "flex size-9 items-center justify-center rounded-lg border text-lg transition " +
                          (active
                            ? "border-foreground bg-accent"
                            : "border-border hover:bg-accent/50")
                        }
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

        <div className="grid grid-cols-[2fr_1fr] gap-3">
          <FormField
            control={form.control}
            name="budget_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Buget lunar (opțional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0,00"
                    className="tabular-nums"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const n = e.target.valueAsNumber;
                      field.onChange(Number.isFinite(n) ? n : null);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Pentru limită informativă pe categorie. Bugetele complete
                  intră în Faza 5.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="budget_currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monedă</FormLabel>
                <Select
                  value={field.value ?? "RON"}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
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
            "Crează categoria"
          )}
        </Button>
      </form>
    </Form>
  );
}
