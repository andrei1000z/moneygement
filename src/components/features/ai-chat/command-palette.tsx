"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarClock,
  CreditCard,
  Home,
  ListChecks,
  PiggyBank,
  PieChart,
  Plus,
  Repeat,
  Settings,
  Sparkles,
  Store,
  Tags,
  Target,
  Ticket,
  Upload,
  Wallet,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useQuickAddStore } from "@/stores/quick-add-store";

type Action = {
  id: string;
  label: string;
  Icon: typeof Home;
  onSelect: () => void;
  shortcut?: string;
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const openQuickAdd = useQuickAddStore((s) => s.openSheet);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Cmd+K (Mac) sau Ctrl+K (Win/Linux).
      const isToggle =
        (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey);
      if (isToggle) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const navActions: Action[] = [
    { id: "home", label: "Acasă", Icon: Home, onSelect: () => go("/") },
    {
      id: "transactions",
      label: "Tranzacții",
      Icon: ListChecks,
      onSelect: () => go("/transactions"),
    },
    {
      id: "budgets",
      label: "Bugete",
      Icon: PieChart,
      onSelect: () => go("/budgets"),
    },
    {
      id: "goals",
      label: "Obiective",
      Icon: Target,
      onSelect: () => go("/goals"),
    },
    {
      id: "accounts",
      label: "Conturi",
      Icon: Wallet,
      onSelect: () => go("/accounts"),
    },
    {
      id: "categories",
      label: "Categorii",
      Icon: Tags,
      onSelect: () => go("/categories"),
    },
    {
      id: "merchants",
      label: "Merchanți",
      Icon: Store,
      onSelect: () => go("/merchants"),
    },
    {
      id: "subscriptions",
      label: "Abonamente",
      Icon: Repeat,
      onSelect: () => go("/subscriptions"),
    },
    {
      id: "fx",
      label: "Curs valutar",
      Icon: BarChart3,
      onSelect: () => go("/insights/fx"),
    },
    {
      id: "import",
      label: "Importă CSV",
      Icon: Upload,
      onSelect: () => go("/import"),
    },
    {
      id: "connections",
      label: "Conexiuni bancare",
      Icon: Building2,
      onSelect: () => go("/connections"),
    },
    {
      id: "income",
      label: "Surse de venit",
      Icon: CalendarClock,
      onSelect: () => go("/income"),
    },
    {
      id: "pension",
      label: "Pilon III",
      Icon: PiggyBank,
      onSelect: () => go("/pension"),
    },
    {
      id: "meal-vouchers",
      label: "Tichete masă",
      Icon: Ticket,
      onSelect: () => go("/accounts/meal-vouchers"),
    },
    {
      id: "settings",
      label: "Setări",
      Icon: Settings,
      onSelect: () => go("/settings"),
    },
  ];

  const quickActions: Action[] = [
    {
      id: "quick-add-expense",
      label: "Adaugă cheltuială",
      Icon: Plus,
      onSelect: () => {
        setOpen(false);
        openQuickAdd({ mode: "expense" });
      },
    },
    {
      id: "quick-add-income",
      label: "Adaugă venit",
      Icon: Plus,
      onSelect: () => {
        setOpen(false);
        openQuickAdd({ mode: "income" });
      },
    },
    {
      id: "quick-add-transfer",
      label: "Transfer între conturi",
      Icon: CreditCard,
      onSelect: () => {
        setOpen(false);
        openQuickAdd({ mode: "transfer" });
      },
    },
    {
      id: "ai-chat",
      label: "Întreabă asistentul",
      Icon: Sparkles,
      onSelect: () => go("/ai"),
    },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Caută o pagină sau o acțiune…" />
      <CommandList>
        <CommandEmpty>Niciun rezultat.</CommandEmpty>

        <CommandGroup heading="Acțiuni rapide">
          {quickActions.map((a) => (
            <CommandItem
              key={a.id}
              value={a.label}
              onSelect={a.onSelect}
            >
              <a.Icon className="text-muted-foreground mr-2 size-4" />
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigare">
          {navActions.map((a) => (
            <CommandItem
              key={a.id}
              value={a.label}
              onSelect={a.onSelect}
            >
              <a.Icon className="text-muted-foreground mr-2 size-4" />
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
