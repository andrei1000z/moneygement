"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { CategoryRow } from "@/hooks/use-categories";
import { cn } from "@/lib/utils";
import type { CategoryType } from "@/types/database";

const RECENT_KEY = "banii.quickadd.recentCategories";

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function bumpRecentCategory(id: string) {
  if (typeof window === "undefined") return;
  const cur = loadRecent().filter((x) => x !== id);
  const next = [id, ...cur].slice(0, 8);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

type Props = {
  categories: CategoryRow[];
  type: CategoryType;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function CategoryGrid({ categories, type, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  const recentIds = useMemo(() => loadRecent(), []);
  const recent = useMemo(
    () =>
      recentIds
        .map((id) => filtered.find((c) => c.id === id))
        .filter(Boolean) as CategoryRow[],
    [recentIds, filtered],
  );

  const fuse = useMemo(
    () =>
      new Fuse(filtered, {
        keys: ["name"],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [filtered],
  );

  const searched = useMemo(() => {
    const q = query.trim();
    if (q.length === 0) return null;
    return fuse.search(q).map((r) => r.item);
  }, [query, fuse]);

  const list = searched ?? filtered;
  const showRecent = !searched && recent.length > 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Caută o categorie…"
          className="pl-9"
          autoFocus
          aria-label="Caută categorie"
        />
      </div>

      {showRecent ? (
        <section>
          <h3 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
            Recente
          </h3>
          <Grid
            categories={recent}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </section>
      ) : null}

      <section>
        {showRecent ? (
          <h3 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
            Toate
          </h3>
        ) : null}
        <Grid categories={list} selectedId={selectedId} onSelect={onSelect} />
      </section>
    </div>
  );
}

function Grid({
  categories,
  selectedId,
  onSelect,
}: {
  categories: CategoryRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (categories.length === 0) {
    return (
      <p className="text-muted-foreground text-center text-sm">
        Niciun rezultat.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
      {categories.map((c) => {
        const active = selectedId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              bumpRecentCategory(c.id);
              onSelect(c.id);
            }}
            className={cn(
              "border-border/60 bg-card hover:bg-accent flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border p-1.5 text-center transition active:scale-95",
              active && "border-foreground bg-accent",
            )}
            style={
              c.color && active ? { boxShadow: `inset 0 0 0 2px ${c.color}` } : undefined
            }
          >
            <span className="text-xl leading-none" aria-hidden>
              {c.icon ?? "📁"}
            </span>
            <span className="text-[10px] font-medium leading-tight line-clamp-2">
              {c.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
