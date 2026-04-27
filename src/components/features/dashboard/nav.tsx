"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  Home,
  ListChecks,
  MoreHorizontal,
  PieChart,
  Plus,
  Repeat,
  Settings,
  Sparkles,
  Store,
  Tags,
  Target,
  Upload,
  Wallet,
  Wallet2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useQuickAddStore, type QuickAddMode } from "@/stores/quick-add-store";

type NavItem = {
  href: string;
  label: string;
  Icon: typeof Home;
  match?: (pathname: string) => boolean;
};

// Tab-uri principale (vizibile în bottom bar pe mobile + sidebar pe desktop).
const PRIMARY: readonly NavItem[] = [
  { href: "/", label: "Acasă", Icon: Home, match: (p) => p === "/" },
  {
    href: "/transactions",
    label: "Tranzacții",
    Icon: ListChecks,
    match: (p) => p.startsWith("/transactions"),
  },
  {
    href: "/budgets",
    label: "Bugete",
    Icon: PieChart,
    match: (p) => p.startsWith("/budgets"),
  },
  {
    href: "/goals",
    label: "Obiective",
    Icon: Target,
    match: (p) => p.startsWith("/goals"),
  },
];

// Linkuri suplimentare — sidebar arată tot, "Mai multe" pe mobil deschide
// un sheet cu același conținut.
const MORE: readonly NavItem[] = [
  {
    href: "/accounts",
    label: "Conturi",
    Icon: Wallet2,
    match: (p) => p.startsWith("/accounts"),
  },
  {
    href: "/categories",
    label: "Categorii",
    Icon: Tags,
    match: (p) => p.startsWith("/categories"),
  },
  {
    href: "/merchants",
    label: "Merchanți",
    Icon: Store,
    match: (p) => p.startsWith("/merchants"),
  },
  {
    href: "/ai",
    label: "Asistent",
    Icon: Sparkles,
    match: (p) => p.startsWith("/ai"),
  },
  {
    href: "/subscriptions",
    label: "Abonamente",
    Icon: Repeat,
    match: (p) => p.startsWith("/subscriptions"),
  },
  {
    href: "/connections",
    label: "Conexiuni bancare",
    Icon: Building2,
    match: (p) => p.startsWith("/connections"),
  },
  {
    href: "/import",
    label: "Importă CSV",
    Icon: Upload,
    match: (p) => p.startsWith("/import"),
  },
  {
    href: "/insights/fx",
    label: "Curs valutar",
    Icon: BarChart3,
    match: (p) => p.startsWith("/insights/fx"),
  },
  {
    href: "/settings",
    label: "Setări",
    Icon: Settings,
    match: (p) => p.startsWith("/settings"),
  },
];

const SIDEBAR_ITEMS: readonly NavItem[] = [...PRIMARY, ...MORE];

function isActive(item: NavItem, pathname: string) {
  return item.match ? item.match(pathname) : pathname === item.href;
}

// ---------- Bottom tab bar (mobile) ---------------------------------------
export function BottomTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Navigare principală"
        className="glass-strong fixed inset-x-2 bottom-2 z-40 mx-auto max-w-md rounded-[--radius-sheet] border md:hidden"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
      >
        <ul className="flex items-stretch justify-between px-1.5 pt-1.5">
          {PRIMARY.slice(0, 2).map((item) => (
            <NavTab key={item.href} item={item} pathname={pathname} />
          ))}
          <li className="flex items-center justify-center px-1">
            <QuickAddFab />
          </li>
          <NavTab item={PRIMARY[2]!} pathname={pathname} />
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(
                "relative flex h-14 w-full flex-col items-center justify-center gap-0.5 px-2 text-[10px] font-medium transition active:scale-95",
                MORE.some((m) => isActive(m, pathname))
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <MoreHorizontal className="size-5" aria-hidden strokeWidth={1.75} />
              <span>Mai multe</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1.5rem)]"
        >
          <SheetHeader className="text-left">
            <SheetTitle>Mai multe</SheetTitle>
            <SheetDescription>
              Setări de bază. Restul vine în fazele următoare.
            </SheetDescription>
          </SheetHeader>
          <ul className="mt-3 grid gap-1">
            {MORE.map((item) => {
              const active = isActive(item, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <item.Icon className="size-4" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}

function NavTab({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(item, pathname);
  return (
    <li className="flex-1">
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex h-14 flex-col items-center justify-center gap-0.5 px-2 text-[10px] font-medium transition-colors duration-200 active:scale-95",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {active ? (
          <span
            aria-hidden
            className="absolute inset-x-1 inset-y-0.5 -z-10 rounded-2xl"
            style={{
              background: "oklch(from var(--accent-emerald) l c h / 0.15)",
              boxShadow:
                "0 0 0 1px oklch(from var(--accent-emerald) l c h / 0.25), inset 0 1px 0 oklch(1 0 0 / 0.1)",
            }}
          />
        ) : null}
        <item.Icon
          className={cn(
            "size-5 transition-transform",
            active && "text-[--accent-emerald]",
          )}
          aria-hidden
          strokeWidth={1.75}
        />
        <span>{item.label}</span>
      </Link>
    </li>
  );
}

// ---------- Sidebar (desktop) ---------------------------------------------
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Navigare principală"
      className="glass m-3 mr-0 hidden w-64 shrink-0 flex-col rounded-[--radius-card] md:flex"
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div
          className="flex size-9 items-center justify-center rounded-xl"
          style={{
            background:
              "linear-gradient(135deg, oklch(from var(--accent-emerald) l c h / 0.25), oklch(from var(--accent-cyan) l c h / 0.18))",
            boxShadow:
              "inset 0 1px 0 oklch(1 0 0 / 0.15), 0 4px 12px -2px oklch(from var(--accent-emerald) l c h / 0.3)",
          }}
        >
          <Wallet
            className="size-5 text-[--accent-emerald]"
            aria-hidden
            strokeWidth={1.75}
          />
        </div>
        <span className="text-gradient-aurora text-xl font-semibold tracking-tight">
          Banii
        </span>
      </div>
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {PRIMARY.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} />
          ))}
        </ul>
        <div className="text-muted-foreground mt-6 mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.15em]">
          Configurare
        </div>
        <ul className="space-y-1">
          {MORE.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} />
          ))}
        </ul>
      </nav>
      <div className="px-3 pb-5">
        <QuickAddSidebarButton />
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const active = isActive(item, pathname);
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200",
          active
            ? "text-foreground"
            : "text-muted-foreground hover:bg-[oklch(from_var(--foreground)_l_c_h/0.05)] hover:text-foreground",
        )}
        style={
          active
            ? {
                background: "oklch(from var(--accent-emerald) l c h / 0.12)",
                boxShadow:
                  "inset 0 1px 0 oklch(1 0 0 / 0.06), 0 0 0 1px oklch(from var(--accent-emerald) l c h / 0.2)",
              }
            : undefined
        }
      >
        <item.Icon
          className={cn("size-4", active && "text-[--accent-emerald]")}
          aria-hidden
          strokeWidth={1.75}
        />
        {item.label}
      </Link>
    </li>
  );
}

// Static export — used by tests / docs.
export const NAV_ITEMS = SIDEBAR_ITEMS;

// ---------- FAB cu long-press → mode menu --------------------------------
function QuickAddFab() {
  const openSheet = useQuickAddStore((s) => s.openSheet);
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPress = useRef(false);

  function startLongPress() {
    wasLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      wasLongPress.current = true;
      setMenuOpen(true);
    }, 450);
  }
  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleClick() {
    if (wasLongPress.current) {
      wasLongPress.current = false;
      return;
    }
    openSheet({ mode: "expense" });
  }

  function pickMode(mode: QuickAddMode) {
    setMenuOpen(false);
    openSheet({ mode });
  }

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <button
        type="button"
        aria-label="Adaugă rapid"
        onClick={handleClick}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuOpen(true);
        }}
        className={cn(
          "relative -mt-7 flex size-14 items-center justify-center rounded-full text-[--bg-base] transition-transform duration-200 active:scale-90",
          "bg-gradient-to-br from-[--accent-emerald] to-[--accent-cyan]",
          "shadow-[0_0_0_4px_oklch(from_var(--bg-base)_l_c_h/0.5),0_0_24px_-4px_oklch(from_var(--accent-emerald)_l_c_h/0.55),0_0_60px_-8px_oklch(from_var(--accent-emerald)_l_c_h/0.4)]",
        )}
      >
        <Plus className="size-6" aria-hidden strokeWidth={2.5} />
      </button>
      <DropdownMenuContent align="center" side="top">
        <DropdownMenuItem onSelect={() => pickMode("expense")}>
          💸 Cheltuială
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => pickMode("income")}>
          💰 Venit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => pickMode("transfer")}>
          ↔ Transfer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function QuickAddSidebarButton() {
  const openSheet = useQuickAddStore((s) => s.openSheet);
  return (
    <button
      type="button"
      onClick={() => openSheet({ mode: "expense" })}
      className={cn(
        "relative flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[--bg-base] transition-transform duration-200 active:scale-[0.97]",
        "bg-gradient-to-br from-[--accent-emerald] to-[--accent-cyan]",
        "shadow-[0_0_0_1px_oklch(from_var(--accent-emerald)_l_c_h/0.3),0_4px_16px_-4px_oklch(from_var(--accent-emerald)_l_c_h/0.4)]",
      )}
    >
      <Plus className="size-4" aria-hidden strokeWidth={2.25} />
      Adaugă rapid
    </button>
  );
}
