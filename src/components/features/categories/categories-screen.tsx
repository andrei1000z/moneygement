"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Lock, Plus, Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useCategories, type CategoryRow } from "@/hooks/use-categories";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CategoryType } from "@/types/database";

import { CategoryForm } from "./category-form";

const TABS: { value: CategoryType; label: string }[] = [
  { value: "expense", label: "Cheltuieli" },
  { value: "income", label: "Venituri" },
  { value: "transfer", label: "Transferuri" },
];

export function CategoriesScreen() {
  const [active, setActive] = useState<CategoryType>("expense");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);

  const { data, isLoading, isError } = useCategories({ type: active });

  const tree = useMemo(() => buildTree(data ?? []), [data]);

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(category: CategoryRow) {
    setEditing(category);
    setSheetOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
            Categorii
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Cum împarți banii
          </h1>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="size-4" aria-hidden /> Adaugă categorie
        </Button>
      </header>

      <Tabs
        value={active}
        onValueChange={(v) => setActive(v as CategoryType)}
        className="space-y-4"
      >
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={active}>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-xl border p-6 text-sm">
              Nu am putut încărca categoriile.
            </div>
          ) : tree.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            <ul className="space-y-1">
              {tree.map((node) => (
                <CategoryNode
                  key={node.id}
                  node={node}
                  depth={0}
                  onEdit={openEdit}
                />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md"
        >
          <SheetHeader className="border-b">
            <SheetTitle>
              {editing ? "Editează categoria" : "Adaugă categorie"}
            </SheetTitle>
            <SheetDescription>
              Categoriile system (cu lock) nu pot fi redenumite, dar le poți
              schimba iconița, culoarea și bugetul.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-5">
            {sheetOpen ? (
              <CategoryForm
                key={editing?.id ?? "new"}
                category={editing}
                defaultType={active}
                onDone={() => setSheetOpen(false)}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border-border/60 bg-card/40 flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
      <div className="bg-accent text-accent-foreground mb-4 flex size-12 items-center justify-center rounded-full">
        <Tags className="size-5" aria-hidden />
      </div>
      <h3 className="text-base font-semibold">Niciun item</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        Categoriile default ar trebui să apară automat la prima creare de
        household. Adaugă una nouă dacă lipsește.
      </p>
      <Button onClick={onCreate} className="mt-5">
        <Plus className="size-4" aria-hidden /> Adaugă categorie
      </Button>
    </div>
  );
}

type Node = CategoryRow & { children: Node[] };

function buildTree(rows: CategoryRow[]): Node[] {
  const byId = new Map<string, Node>();
  for (const row of rows) {
    byId.set(row.id, { ...row, children: [] });
  }
  const roots: Node[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortFn = (a: Node, b: Node) => a.name.localeCompare(b.name, "ro");
  roots.sort(sortFn);
  for (const n of byId.values()) n.children.sort(sortFn);
  return roots;
}

function CategoryNode({
  node,
  depth,
  onEdit,
}: {
  node: Node;
  depth: number;
  onEdit: (c: CategoryRow) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onEdit(node)}
        className={cn(
          "border-border/60 bg-card hover:bg-accent/40 group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition",
        )}
        style={{ marginLeft: depth > 0 ? depth * 20 : undefined }}
      >
        {depth > 0 ? (
          <ChevronRight
            className="text-muted-foreground size-3.5 shrink-0"
            aria-hidden
          />
        ) : null}
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-lg"
          style={{
            backgroundColor: node.color ? `${node.color}20` : "var(--accent)",
          }}
          aria-hidden
        >
          {node.icon ?? "📁"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{node.name}</span>
            {node.is_system ? (
              <Lock
                className="text-muted-foreground size-3"
                aria-label="Categorie system"
              />
            ) : null}
          </div>
          {node.budget_amount ? (
            <p className="text-muted-foreground text-xs tabular-nums">
              {formatMoney(node.budget_amount, "RON")} / lună
            </p>
          ) : null}
        </div>
      </button>
      {node.children.length > 0 ? (
        <ul className="mt-1 space-y-1">
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onEdit={onEdit}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
