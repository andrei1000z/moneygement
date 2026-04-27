"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { AccountRow } from "@/hooks/use-accounts";
import { saveMruAccount } from "@/stores/quick-add-store";
import { cn } from "@/lib/utils";

type Props = {
  accounts: AccountRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function AccountPill({ accounts, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const selected = accounts.find((a) => a.id === selectedId) ?? accounts[0];

  function handleSelect(id: string) {
    onSelect(id);
    saveMruAccount(id);
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        {selected ? (
          <>
            <span aria-hidden>{selected.icon ?? "💳"}</span>
            <span className="truncate max-w-[120px]">{selected.name}</span>
            <span className="text-muted-foreground text-[10px]">
              {selected.currency}
            </span>
          </>
        ) : (
          <span>Selectează cont</span>
        )}
        <ChevronDown className="size-3" aria-hidden />
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Alege contul</DrawerTitle>
            <DrawerDescription>
              Mai recent folosit primul.
            </DrawerDescription>
          </DrawerHeader>
          <ul className="space-y-1 px-3 pb-6">
            {accounts.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(a.id)}
                  className={cn(
                    "glass-thin hover:bg-(--surface-hover) flex w-full items-center gap-3 rounded-xl p-3 text-left transition",
                    selectedId === a.id && "bg-accent",
                  )}
                >
                  <span className="text-xl" aria-hidden>
                    {a.icon ?? "💳"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {a.bank_name ?? "—"} · {a.currency}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </DrawerContent>
      </Drawer>
    </>
  );
}
