"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ListChecks,
  MoreHorizontal,
  PieChart,
  Plus,
  Store,
  Tags,
  Target,
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
        className="bg-background/95 supports-[backdrop-filter]:bg-background/70 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
          {PRIMARY.slice(0, 2).map((item) => (
            <NavTab key={item.href} item={item} pathname={pathname} />
          ))}
          <li className="flex items-center justify-center px-2">
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
                "flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition",
                MORE.some((m) => isActive(m, pathname))
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <MoreHorizontal className="size-5" aria-hidden />
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
          "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <item.Icon
          className={cn("size-5", active && "scale-110")}
          aria-hidden
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
      className="bg-background hidden w-60 shrink-0 border-r md:flex md:flex-col"
    >
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
          <Wallet className="size-5" aria-hidden />
        </div>
        <span className="text-lg font-semibold tracking-tight">Banii</span>
      </div>
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {PRIMARY.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} />
          ))}
        </ul>
        <div className="text-muted-foreground mt-6 mb-1 px-3 text-[11px] font-medium uppercase tracking-wider">
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
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
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
        className="bg-primary text-primary-foreground ring-background -mt-6 flex size-14 items-center justify-center rounded-full shadow-lg ring-4 transition active:scale-95"
      >
        <Plus className="size-6" aria-hidden />
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
      className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition"
    >
      <Plus className="size-4" aria-hidden />
      Adaugă rapid
    </button>
  );
}
