"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { CalendarHeart, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { upcomingSeasonal } from "@/lib/seasonal/budgets";
import { formatMoney } from "@/lib/money";

const DISMISSED_KEY = "banii-seasonal-dismissed";

type DismissedMap = Record<string, string>; // catalogId → dismissed-on date

function loadDismissed(): DismissedMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveDismissed(map: DismissedMap) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(map));
}

/**
 * Card discreet care propune setarea unui buget sezonier (Mărțișor,
 * Paște, vacanță, Black Friday, Crăciun) cu 1 lună înainte. Dispare
 * imediat ce userul îl închide; dismiss persistă 30 zile per catalog.
 */
export function SeasonalPrompt() {
  const [hidden, setHidden] = useState<DismissedMap>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loaded = loadDismissed();
    const t = setTimeout(() => {
      setMounted(true);
      setHidden(loaded);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) return null;

  const upcoming = upcomingSeasonal(new Date(), 31);
  const today = new Date().toISOString().slice(0, 10);
  const filtered = upcoming.filter((u) => {
    const dismissedOn = hidden[u.id];
    if (!dismissedOn) return true;
    const days = Math.abs(
      (Date.parse(today) - Date.parse(dismissedOn)) / 86400000,
    );
    return days >= 30;
  });

  const next = filtered[0];
  if (!next) return null;

  function dismiss() {
    if (!next) return;
    const updated = { ...hidden, [next.id]: today };
    setHidden(updated);
    saveDismissed(updated);
  }

  return (
    <div className="glass-thin relative rounded-[--radius-card] p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Închide"
        className="text-muted-foreground hover:text-foreground absolute right-2 top-2 p-1"
      >
        <X className="size-3.5" />
      </button>
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklch, var(--accent-yellow), transparent 75%), color-mix(in oklch, var(--accent-blue), transparent 82%))",
            boxShadow:
              "inset 0 1px 0 oklch(1 0 0 / 0.1), 0 4px 12px -2px color-mix(in oklch, var(--accent-yellow), transparent 70%)",
          }}
        >
          <CalendarHeart
            className="text-[--accent-pink] size-5"
            aria-hidden
            strokeWidth={1.75}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{next.display} se apropie</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Începe{" "}
            {format(parseISO(next.window.start), "d MMM yyyy", {
              locale: ro,
            })}
            . Buget sugerat:{" "}
            <span className="text-foreground font-medium">
              {formatMoney(next.suggested_budget_minor, "RON")}
            </span>
            .
          </p>
          <div className="mt-3">
            <Button asChild size="sm">
              <Link href="/budgets">Setează buget</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
