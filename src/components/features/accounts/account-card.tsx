"use client";

import { useTransition } from "react";
import {
  Archive,
  ArchiveRestore,
  MoreVertical,
  Pencil,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  archiveAccount,
  unarchiveAccount,
} from "@/app/(dashboard)/accounts/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInvalidateAccounts, type AccountRow } from "@/hooks/use-accounts";
import { cn } from "@/lib/utils";

import { AccountBalance } from "./account-balance";
import { ACCOUNT_TYPE_META } from "./account-meta";

type Props = {
  account: AccountRow;
  onEdit?: (account: AccountRow) => void;
};

export function AccountCard({ account, onEdit }: Props) {
  const meta = ACCOUNT_TYPE_META[account.type];
  const archived = !!account.archived_at;
  const [pending, startTransition] = useTransition();
  const invalidate = useInvalidateAccounts();

  function handleArchiveToggle() {
    startTransition(async () => {
      const result = archived
        ? await unarchiveAccount(account.id)
        : await archiveAccount(account.id);
      if (!result.ok) {
        toast.error("Operația a eșuat", { description: result.error });
        return;
      }
      toast.success(archived ? "Cont reactivat" : "Cont arhivat");
      await invalidate();
    });
  }

  return (
    <article
      className={cn(
        "border-border bg-card group relative flex items-center gap-4 rounded-xl border p-4 transition",
        archived && "opacity-60",
      )}
      style={
        account.color
          ? { boxShadow: `inset 4px 0 0 ${account.color}` }
          : undefined
      }
    >
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-2xl"
        style={{
          backgroundColor: account.color
            ? `${account.color}20`
            : "var(--accent)",
        }}
        aria-hidden
      >
        {account.icon ?? meta.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold">{account.name}</h3>
          {account.is_shared ? (
            <span
              className="text-muted-foreground inline-flex items-center"
              aria-label="Partajat cu household"
              title="Partajat cu household"
            >
              <Users className="size-3.5" aria-hidden />
            </span>
          ) : null}
        </div>
        <p className="text-muted-foreground truncate text-xs">
          {[account.bank_name, account.iban_last4 ? `•• ${account.iban_last4}` : null]
            .filter(Boolean)
            .join(" · ") || meta.label}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <AccountBalance
            amount={account.current_balance}
            currency={account.currency}
            className="text-base"
          />
          <Badge variant="secondary" className="mt-1 h-5 px-1.5 text-[10px]">
            {account.currency === "RON" ? "lei" : account.currency}
          </Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="opacity-0 transition group-hover:opacity-100"
              aria-label="Acțiuni cont"
            >
              <MoreVertical className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit?.(account)}>
              <Pencil className="size-4" aria-hidden /> Editează
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={pending}
              onSelect={handleArchiveToggle}
              className={archived ? undefined : "text-destructive"}
            >
              {archived ? (
                <>
                  <ArchiveRestore className="size-4" aria-hidden /> Reactivează
                </>
              ) : (
                <>
                  <Archive className="size-4" aria-hidden /> Arhivează
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
