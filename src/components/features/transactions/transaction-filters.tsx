"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { AccountRow } from "@/hooks/use-accounts";
import type { CategoryRow } from "@/hooks/use-categories";
import type { TransactionFilters } from "@/hooks/use-transactions";

type Props = {
  filters: TransactionFilters;
  onChange: (next: TransactionFilters) => void;
  accounts: AccountRow[];
  categories: CategoryRow[];
};

export function TransactionFiltersBar({
  filters,
  onChange,
  accounts,
  categories,
}: Props) {
  const [search, setSearch] = useState(filters.search ?? "");

  // Debounce search → URL.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((search ?? "") !== (filters.search ?? "")) {
        onChange({ ...filters, search: search.trim() || undefined });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function toggleAccount(id: string) {
    const cur = new Set(filters.accountIds ?? []);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    onChange({
      ...filters,
      accountIds: cur.size === 0 ? undefined : Array.from(cur),
    });
  }

  function toggleCategory(id: string) {
    const cur = new Set(filters.categoryIds ?? []);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    onChange({
      ...filters,
      categoryIds: cur.size === 0 ? undefined : Array.from(cur),
    });
  }

  function clearAll() {
    setSearch("");
    onChange({});
  }

  const accountCount = filters.accountIds?.length ?? 0;
  const categoryCount = filters.categoryIds?.length ?? 0;
  const activeChips = [
    filters.from || filters.to ? "Perioadă" : null,
    accountCount > 0 ? `${accountCount} conturi` : null,
    categoryCount > 0 ? `${categoryCount} categorii` : null,
    filters.tags?.length ? `${filters.tags.length} tag-uri` : null,
    filters.ownership?.length ? `${filters.ownership.length} owner` : null,
    filters.status?.length ? `${filters.status.length} status` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută după payee sau notițe…"
            className="pl-9"
            aria-label="Caută tranzacții"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={filters.from ?? ""}
            onChange={(e) =>
              onChange({ ...filters, from: e.target.value || undefined })
            }
            className="max-w-[150px]"
            aria-label="De la"
          />
          <span className="text-muted-foreground text-xs">→</span>
          <Input
            type="date"
            value={filters.to ?? ""}
            onChange={(e) =>
              onChange({ ...filters, to: e.target.value || undefined })
            }
            className="max-w-[150px]"
            aria-label="Până la"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              Conturi {accountCount > 0 ? `· ${accountCount}` : ""}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="max-h-72 overflow-y-auto p-2">
            {accounts.length === 0 ? (
              <p className="text-muted-foreground p-2 text-xs">
                Niciun cont activ.
              </p>
            ) : (
              <ul className="space-y-1">
                {accounts.map((a) => {
                  const checked = (filters.accountIds ?? []).includes(a.id);
                  return (
                    <li key={a.id}>
                      <label className="hover:bg-accent/40 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleAccount(a.id)}
                        />
                        {a.icon ? `${a.icon} ` : ""}
                        {a.name}
                        <span className="text-muted-foreground ml-auto text-xs">
                          {a.currency}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              Categorii {categoryCount > 0 ? `· ${categoryCount}` : ""}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="max-h-72 overflow-y-auto p-2">
            <ul className="space-y-1">
              {categories.map((c) => {
                const checked = (filters.categoryIds ?? []).includes(c.id);
                return (
                  <li key={c.id}>
                    <label className="hover:bg-accent/40 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleCategory(c.id)}
                      />
                      {c.icon ? `${c.icon} ` : ""}
                      {c.name}
                    </label>
                  </li>
                );
              })}
            </ul>
          </PopoverContent>
        </Popover>

        <Select
          value={filters.ownership?.[0] ?? "__all__"}
          onValueChange={(v) =>
            onChange({
              ...filters,
              ownership: v === "__all__" ? undefined : ([v] as never),
            })
          }
        >
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toți owners</SelectItem>
            <SelectItem value="mine">👤 A mea</SelectItem>
            <SelectItem value="shared">👥 Comună</SelectItem>
            <SelectItem value="yours">🤝 A celuilalt</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status?.[0] ?? "__all__"}
          onValueChange={(v) =>
            onChange({
              ...filters,
              status: v === "__all__" ? undefined : ([v] as never),
            })
          }
        >
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Orice status</SelectItem>
            <SelectItem value="cleared">Confirmate</SelectItem>
            <SelectItem value="pending">În așteptare</SelectItem>
            <SelectItem value="scheduled">Programate</SelectItem>
          </SelectContent>
        </Select>

        {activeChips.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="size-4" aria-hidden /> Curăță
          </Button>
        ) : null}
      </div>

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((c) => (
            <Badge key={c} variant="secondary">
              {c}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
