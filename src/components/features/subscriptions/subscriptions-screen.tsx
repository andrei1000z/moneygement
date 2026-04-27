"use client";

import { useMemo, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import {
  AlertTriangle,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  runSubscriptionDetector,
  setSubscriptionStatus,
} from "@/app/(dashboard)/subscriptions/actions";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Subscription = {
  id: string;
  payee: string;
  cadence: "monthly" | "yearly" | "weekly" | "biweekly" | "quarterly";
  median_amount: number;
  currency: string;
  occurrences_count: number;
  first_seen: string;
  last_seen: string;
  status: "active" | "paused" | "cancelled";
  price_hike_alert: number | null;
};

const CADENCE_LABEL: Record<Subscription["cadence"], string> = {
  weekly: "săptămânal",
  biweekly: "bisăptămânal",
  monthly: "lunar",
  quarterly: "trimestrial",
  yearly: "anual",
};

const CADENCE_PER_MONTH: Record<Subscription["cadence"], number> = {
  weekly: 4.345,
  biweekly: 2.17,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

export function SubscriptionsScreen({
  subscriptions,
}: {
  subscriptions: Subscription[];
}) {
  const [pending, start] = useTransition();

  const monthlyTotal = useMemo(() => {
    let total = 0;
    let currency = "RON";
    for (const s of subscriptions) {
      if (s.status !== "active") continue;
      total += s.median_amount * CADENCE_PER_MONTH[s.cadence];
      currency = s.currency;
    }
    return { total, currency };
  }, [subscriptions]);

  function rescan() {
    start(async () => {
      const res = await runSubscriptionDetector();
      if (!res.ok) toast.error(res.error);
      else toast.success(`${res.data.detected} abonamente detectate.`);
    });
  }

  function changeStatus(
    id: string,
    status: Subscription["status"],
  ) {
    start(async () => {
      const res = await setSubscriptionStatus(id, status);
      if (!res.ok) toast.error(res.error);
    });
  }

  const active = subscriptions.filter((s) => s.status === "active");
  const inactive = subscriptions.filter((s) => s.status !== "active");

  return (
    <div className="space-y-4">
      <div className="glass-thin flex items-center justify-between rounded-(--radius-card) p-4">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            Cost lunar (active)
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums">
            {formatMoney(Math.round(monthlyTotal.total), monthlyTotal.currency)}
          </p>
        </div>
        <Button onClick={rescan} disabled={pending} variant="outline" size="sm">
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 size-4" />
          )}
          Re-scanează
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border p-6 text-center text-sm">
          Niciun abonament detectat încă. Apasă „Re-scanează&rdquo; pentru
          analiza istoricului.
        </p>
      ) : null}

      {active.length > 0 ? (
        <SubsList
          title="Active"
          subs={active}
          onPause={(id) => changeStatus(id, "paused")}
          onCancel={(id) => changeStatus(id, "cancelled")}
          showHikeBadge
        />
      ) : null}

      {inactive.length > 0 ? (
        <SubsList
          title="Pauzate / anulate"
          subs={inactive}
          onResume={(id) => changeStatus(id, "active")}
          dim
        />
      ) : null}
    </div>
  );
}

function SubsList({
  title,
  subs,
  onPause,
  onCancel,
  onResume,
  showHikeBadge,
  dim,
}: {
  title: string;
  subs: Subscription[];
  onPause?: (id: string) => void;
  onCancel?: (id: string) => void;
  onResume?: (id: string) => void;
  showHikeBadge?: boolean;
  dim?: boolean;
}) {
  return (
    <section className="glass-thin overflow-hidden rounded-(--radius-card)">
      <h2 className="text-muted-foreground border-b px-4 py-2.5 text-xs uppercase tracking-wider">
        {title} ({subs.length})
      </h2>
      <ul className="divide-y">
        {subs.map((s) => (
          <li
            key={s.id}
            className={cn(
              "flex items-baseline justify-between gap-3 px-4 py-3",
              dim && "opacity-60",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-medium">{s.payee}</p>
                {showHikeBadge && s.price_hike_alert ? (
                  <span className="text-amber-600 dark:text-amber-300 inline-flex items-center gap-0.5 text-[10px]">
                    <AlertTriangle className="size-3" />
                    +{s.price_hike_alert.toFixed(0)}%
                  </span>
                ) : null}
              </div>
              <p className="text-muted-foreground text-xs">
                {CADENCE_LABEL[s.cadence]} · {s.occurrences_count} plăți · din{" "}
                {format(parseISO(s.first_seen), "MMM yyyy", { locale: ro })}
              </p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold tabular-nums">
                {formatMoney(s.median_amount, s.currency)}
              </span>
              <div className="flex gap-1">
                {onPause ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => onPause(s.id)}
                    aria-label="Pauzează"
                  >
                    <Pause className="size-3.5" />
                  </Button>
                ) : null}
                {onResume ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => onResume(s.id)}
                    aria-label="Reactivează"
                  >
                    <Play className="size-3.5" />
                  </Button>
                ) : null}
                {onCancel ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => onCancel(s.id)}
                    aria-label="Marchează anulat"
                  >
                    <Trash2 className="text-muted-foreground size-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
