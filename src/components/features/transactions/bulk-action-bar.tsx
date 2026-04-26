"use client";

import { useTransition } from "react";
import { CheckCheck, Tag, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";

import { bulkUpdate } from "@/app/(dashboard)/transactions/actions";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCategories } from "@/hooks/use-categories";
import { useInvalidateTransactions } from "@/hooks/use-transactions";
import type { Ownership } from "@/types/database";

type Props = {
  ids: string[];
  onClear: () => void;
  onSelectAll: () => void;
  totalVisible: number;
};

export function BulkActionBar({ ids, onClear, onSelectAll, totalVisible }: Props) {
  const [pending, startTransition] = useTransition();
  const { data: categories } = useCategories();
  const invalidate = useInvalidateTransactions();

  function applyCategorize(categoryId: string | null) {
    startTransition(async () => {
      const r = await bulkUpdate(ids, { category_id: categoryId });
      if (!r.ok) {
        toast.error("Bulk update eșuat", { description: r.error });
        return;
      }
      toast.success(`${r.data.count} tranzacții actualizate`);
      await invalidate();
      onClear();
    });
  }

  function applyOwnership(ownership: Ownership) {
    startTransition(async () => {
      const r = await bulkUpdate(ids, { ownership });
      if (!r.ok) {
        toast.error("Bulk update eșuat", { description: r.error });
        return;
      }
      toast.success(`${r.data.count} tranzacții marcate`);
      await invalidate();
      onClear();
    });
  }

  function applyReviewed() {
    startTransition(async () => {
      const r = await bulkUpdate(ids, { add_tags: ["reviewed"] });
      if (!r.ok) {
        toast.error("Bulk update eșuat", { description: r.error });
        return;
      }
      toast.success(`${r.data.count} tranzacții marcate ca revizuite`);
      await invalidate();
      onClear();
    });
  }

  function applyDelete() {
    startTransition(async () => {
      const r = await bulkUpdate(ids, { delete: true });
      if (!r.ok) {
        toast.error("Ștergere eșuată", { description: r.error });
        return;
      }
      toast.success(`${r.data.count} tranzacții șterse`);
      await invalidate();
      onClear();
    });
  }

  return (
    <div
      className="bg-background/95 supports-[backdrop-filter]:bg-background/85 fixed inset-x-0 bottom-0 z-50 border-t shadow-lg backdrop-blur md:bottom-4 md:left-1/2 md:right-auto md:max-w-2xl md:-translate-x-1/2 md:rounded-2xl md:border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="toolbar"
      aria-label="Acțiuni bulk"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          aria-label="Ieși din selecție"
        >
          <X className="size-4" aria-hidden />
        </Button>
        <span className="text-sm font-medium">
          {ids.length} selectate
        </span>
        <Button variant="ghost" size="sm" onClick={onSelectAll}>
          Selectează toate ({totalVisible})
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={pending}>
                <Tag className="size-4" aria-hidden /> Categorisește
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
              <DropdownMenuLabel>Categorie</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => applyCategorize(null)}>
                — Necategorisit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {(categories ?? []).map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onSelect={() => applyCategorize(c.id)}
                >
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={pending}>
                <Users className="size-4" aria-hidden /> Apartenență
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => applyOwnership("mine")}>
                👤 A mea
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => applyOwnership("shared")}>
                👥 Comună
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => applyOwnership("yours")}>
                🤝 A celuilalt
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={applyReviewed}
            disabled={pending}
          >
            <CheckCheck className="size-4" aria-hidden /> Revizuit
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={pending}>
                <Trash2 className="size-4" aria-hidden /> Șterge
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Șterge {ids.length} tranzacții?</AlertDialogTitle>
                <AlertDialogDescription>
                  Acțiunea nu poate fi anulată. Soldurile conturilor se
                  recalculează automat.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Renunță</AlertDialogCancel>
                <AlertDialogAction onClick={applyDelete}>
                  Șterge
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
