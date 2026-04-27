"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Plus, Search, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/use-categories";
import { useMerchants, type MerchantRow } from "@/hooks/use-merchants";
import { cn } from "@/lib/utils";

import { MerchantForm } from "./merchant-form";

export function MerchantsScreen() {
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<MerchantRow | null>(null);
  const [drawerMerchant, setDrawerMerchant] = useState<MerchantRow | null>(
    null,
  );

  const { data, isLoading, isError } = useMerchants({ search });
  const { data: categories } = useCategories();
  const categoryById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories ?? []) m.set(c.id, c.icon ? `${c.icon} ${c.name}` : c.name);
    return m;
  }, [categories]);

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(m: MerchantRow) {
    setEditing(m);
    setDrawerMerchant(null);
    setSheetOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
            Merchanți
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Locuri unde cheltuiești
          </h1>
        </div>
        <Button onClick={openCreate} className="shrink-0 self-start md:self-auto">
          <Plus className="size-4" aria-hidden /> Adaugă merchant
        </Button>
      </header>

      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută Lidl, Tazz, Bolt..."
          className="pl-9"
          aria-label="Caută merchant"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-xl border p-6 text-sm">
          Nu am putut încărca merchanții.
        </div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState search={search} onCreate={openCreate} />
      ) : (
        <ul className="space-y-2">
          {(data ?? []).map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setDrawerMerchant(m)}
                className={cn(
                  "glass-thin hover:bg-(--surface-hover-faint) flex w-full items-center gap-3 rounded-lg border p-3 text-left transition",
                )}
              >
                <div
                  className="bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                  aria-hidden
                >
                  {m.logo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.logo_url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <Store
                      className="text-muted-foreground size-4"
                      aria-hidden
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {m.default_category_id
                      ? (categoryById.get(m.default_category_id) ?? "—")
                      : "Fără categorie default"}
                  </p>
                </div>
                {m.website ? (
                  <ExternalLink
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md"
        >
          <SheetHeader className="border-b">
            <SheetTitle>
              {editing ? "Editează merchant" : "Adaugă merchant"}
            </SheetTitle>
            <SheetDescription>
              Completează numele așa cum apare în extrasele bancare. Logo-ul
              accelerează recunoașterea ulterioară a tranzacțiilor.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-5">
            {sheetOpen ? (
              <MerchantForm
                key={editing?.id ?? "new"}
                merchant={editing}
                onDone={() => setSheetOpen(false)}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <Drawer
        open={!!drawerMerchant}
        onOpenChange={(open) => !open && setDrawerMerchant(null)}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{drawerMerchant?.name ?? ""}</DrawerTitle>
            <DrawerDescription>
              {drawerMerchant?.default_category_id
                ? `Categorie default: ${categoryById.get(drawerMerchant.default_category_id) ?? "—"}`
                : "Fără categorie default setată"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-2 px-4 pb-6">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => drawerMerchant && openEdit(drawerMerchant)}
            >
              Editează nume / logo / categorie
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled
            >
              Vezi tranzacții (Faza 3)
            </Button>
            {drawerMerchant?.website ? (
              <a
                href={drawerMerchant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="border-border bg-card hover:bg-accent/50 flex w-full items-center justify-between rounded-lg border px-4 py-2 text-sm"
              >
                {drawerMerchant.website}
                <ExternalLink className="size-4" aria-hidden />
              </a>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function EmptyState({
  search,
  onCreate,
}: {
  search: string;
  onCreate: () => void;
}) {
  return (
    <div className="glass-thin flex flex-col items-center justify-center rounded-(--radius-card) border-dashed p-10 text-center">
      <div className="bg-accent text-accent-foreground mb-4 flex size-12 items-center justify-center rounded-full">
        <Store className="size-5" aria-hidden />
      </div>
      <h3 className="text-base font-semibold">
        {search.trim() ? "Niciun rezultat" : "Niciun merchant încă"}
      </h3>
      <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
        {search.trim()
          ? `Nu am găsit nimic pentru "${search}". Schimbă termenul sau adaugă unul nou.`
          : "Merchanții apar aici pe măsură ce categorisești tranzacții. Poți adăuga manual cei pe care îi folosești des."}
      </p>
      <Button onClick={onCreate} className="mt-5">
        <Plus className="size-4" aria-hidden /> Adaugă merchant
      </Button>
    </div>
  );
}
