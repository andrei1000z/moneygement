"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AccountRow } from "@/hooks/use-accounts";

import { AccountForm } from "./account-form";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountRow | null;
};

export function AccountSheet({ open, onOpenChange, account }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md"
      >
        <SheetHeader className="border-b">
          <SheetTitle>
            {account ? "Editează contul" : "Adaugă cont"}
          </SheetTitle>
          <SheetDescription>
            {account
              ? "Schimbă datele contului. IBAN-ul nou (dacă îl introduci) îl rescrie pe cel criptat."
              : "Completează datele unui cont nou. Dacă lași IBAN-ul gol, contul nu primește criptare."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-5">
          {open ? (
            <AccountForm
              key={account?.id ?? "new"}
              account={account}
              onDone={() => onOpenChange(false)}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
