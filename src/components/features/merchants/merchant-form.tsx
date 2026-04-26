"use client";

import { useState, useTransition } from "react";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import {
  createMerchant,
  merchantInputSchema,
  updateMerchant,
  type MerchantInput,
} from "@/app/(dashboard)/merchants/actions";
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
import { useCategories } from "@/hooks/use-categories";
import {
  type MerchantRow,
  useInvalidateMerchants,
} from "@/hooks/use-merchants";

const formSchema = merchantInputSchema;
type FormValues = z.infer<typeof formSchema>;

type Props = {
  merchant?: MerchantRow | null;
  onDone?: () => void;
};

export function MerchantForm({ merchant, onDone }: Props) {
  const isEdit = !!merchant;
  const [pending, startTransition] = useTransition();
  const invalidate = useInvalidateMerchants();
  const { data: categories } = useCategories({ type: "expense" });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: merchant?.name ?? "",
      logo_url: merchant?.logo_url ?? "",
      default_category_id: merchant?.default_category_id ?? null,
      website: merchant?.website ?? "",
    },
  });

  const logoUrl = form.watch("logo_url");
  const [logoError, setLogoError] = useState(false);

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const input: MerchantInput = values;
      const result = isEdit
        ? await updateMerchant(merchant!.id, input)
        : await createMerchant(input);
      if (!result.ok) {
        toast.error(
          isEdit
            ? "Nu am putut salva merchant-ul"
            : "Nu am putut crea merchant-ul",
          { description: result.error },
        );
        return;
      }
      toast.success(isEdit ? "Merchant actualizat" : "Merchant creat");
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
                  placeholder="ex: Lidl, eMAG, Tazz, Bolt"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logo_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo URL (opțional)</FormLabel>
              <div className="flex items-start gap-3">
                <FormControl>
                  <Input
                    placeholder="https://logo.clearbit.com/..."
                    autoComplete="off"
                    inputMode="url"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      setLogoError(false);
                      field.onChange(e);
                    }}
                  />
                </FormControl>
                <div
                  className="border-border/60 bg-muted flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border"
                  aria-hidden
                >
                  {logoUrl && !logoError ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={logoUrl}
                      alt=""
                      className="size-full object-cover"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <ImageIcon
                      className="text-muted-foreground size-4"
                      aria-hidden
                    />
                  )}
                </div>
              </div>
              <FormDescription>
                Sugestie: <code>https://logo.clearbit.com/&lt;domeniu&gt;</code>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="default_category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categorie default (opțional)</FormLabel>
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
                  <SelectItem value="__none__">— fără</SelectItem>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ` : ""}
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Tranzacțiile cu acest merchant primesc automat categoria
                aleasă (Faza 4 va consolida regula).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website (opțional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://emag.ro"
                  autoComplete="off"
                  inputMode="url"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
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
            "Crează merchant"
          )}
        </Button>
      </form>
    </Form>
  );
}
