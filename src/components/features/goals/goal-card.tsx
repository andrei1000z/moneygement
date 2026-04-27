"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { addToGoal } from "@/app/(dashboard)/goals/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useInvalidateGoals, type GoalRow } from "@/hooks/use-goals";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  goal: GoalRow;
  onClick?: (goal: GoalRow) => void;
  onReached?: (goal: GoalRow) => void;
};

const BUCKET_LABELS: Record<GoalRow["bucket_type"], string> = {
  standard: "Parcare",
  goal: "Țintă",
  monthly: "Lunar",
  goal_monthly: "Țintă + lunar",
  debt: "Datorie",
};

export function GoalCard({ goal, onClick, onReached }: Props) {
  const pct = goal.target_amount > 0
    ? Math.min(1, goal.current_amount / goal.target_amount)
    : 0;
  const reached = goal.current_amount >= goal.target_amount;

  const status = reached
    ? "completed"
    : goal.target_date && pct < projectedPct(goal)
    ? "behind"
    : pct >= 0.85
    ? "almost"
    : "on-track";

  return (
    <article
      className={cn(
        "glass-thin relative flex flex-col gap-3 rounded-[--radius-card] p-4 transition",
        onClick && "hover:bg-accent/30 cursor-pointer",
      )}
      onClick={(e) => {
        // Doar dacă click-ul nu e pe o action.
        if ((e.target as HTMLElement).closest("[data-no-card-click]")) return;
        onClick?.(goal);
      }}
    >
      <div className="flex items-start gap-3">
        <ProgressRing
          pct={pct}
          completed={reached}
          emoji={extractEmoji(goal.name)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold">
              {stripEmoji(goal.name)}
            </h3>
            <StatusBadge status={status} />
          </div>
          <p className="text-muted-foreground text-xs">
            {BUCKET_LABELS[goal.bucket_type]}
          </p>
          <p className="mt-1 text-sm tabular-nums">
            <span className="font-semibold">
              {formatMoney(goal.current_amount, goal.currency)}
            </span>
            <span className="text-muted-foreground">
              {" / "}
              {formatMoney(goal.target_amount, goal.currency)}
            </span>
          </p>
          {goal.target_date ? (
            <p className="text-muted-foreground mt-0.5 text-xs">
              {eta(goal)}
            </p>
          ) : null}
        </div>
      </div>

      <AddMoneyDialog goal={goal} onReached={onReached} />
    </article>
  );
}

function StatusBadge({
  status,
}: {
  status: "completed" | "almost" | "on-track" | "behind";
}) {
  if (status === "completed") {
    return <Badge className="bg-emerald-500 hover:bg-emerald-500">Atins ✓</Badge>;
  }
  if (status === "behind") {
    return <Badge variant="destructive">În urmă</Badge>;
  }
  if (status === "almost") {
    return (
      <Badge className="bg-amber-500 hover:bg-amber-500">Aproape gata</Badge>
    );
  }
  return <Badge variant="secondary">Pe drum</Badge>;
}

function ProgressRing({
  pct,
  completed,
  emoji,
}: {
  pct: number;
  completed: boolean;
  emoji: string;
}) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  return (
    <div
      className="relative flex size-20 shrink-0 items-center justify-center"
      aria-label={`Progres ${Math.round(pct * 100)}%`}
    >
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={radius}
          strokeWidth={6}
          fill="none"
          className="stroke-muted"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            "transition-[stroke-dashoffset] duration-700",
            completed ? "stroke-emerald-500" : "stroke-primary",
          )}
        />
      </svg>
      <span className="pointer-events-none absolute text-2xl">
        {emoji || "🎯"}
      </span>
    </div>
  );
}

function AddMoneyDialog({
  goal,
  onReached,
}: {
  goal: GoalRow;
  onReached?: (g: GoalRow) => void;
}) {
  const [pending, startTransition] = useTransition();
  const invalidate = useInvalidateGoals();
  const [amount, setAmount] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  function submit() {
    if (!amount || amount === 0) {
      toast.error("Sumă invalidă");
      return;
    }
    startTransition(async () => {
      const r = await addToGoal(goal.id, amount);
      if (!r.ok) {
        toast.error("Eroare", { description: r.error });
        return;
      }
      toast.success("Adăugat la goal");
      if (r.data.reached) onReached?.(goal);
      await invalidate();
      setAmount(null);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          data-no-card-click
        >
          <Plus className="size-4" aria-hidden /> Adaugă bani
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{goal.name}</DialogTitle>
          <DialogDescription>
            Cât adaugi la goal acum? Folosește o sumă negativă ca să scoți.
          </DialogDescription>
        </DialogHeader>
        <CurrencyInput
          value={amount}
          onChange={(v) => setAmount(v ?? 0)}
          currency={goal.currency}
          allowNegative
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Renunță
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              "Adaugă"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function projectedPct(goal: GoalRow): number {
  if (!goal.target_date) return 0;
  const start = parseISO(goal.created_at);
  const end = parseISO(goal.target_date);
  const now = new Date();
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 1;
  const elapsed = now.getTime() - start.getTime();
  return Math.max(0, Math.min(1, elapsed / total));
}

function eta(goal: GoalRow): string {
  const remaining = goal.target_amount - goal.current_amount;
  if (remaining <= 0) return "Atins! 🎉";
  if (!goal.target_date) {
    return `Mai sunt ${formatMoney(remaining, goal.currency)}`;
  }
  const target = parseISO(goal.target_date);
  const now = new Date();
  const months = Math.max(
    1,
    Math.round(
      (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
    ),
  );
  const perMonth = Math.ceil(remaining / months);
  return `~${formatMoney(perMonth, goal.currency)}/lună → ${format(
    target,
    "MMM yyyy",
    { locale: ro },
  )}`;
}

function extractEmoji(s: string): string {
  // Detectează emoji-ul de la început (presupunere: primul caracter, dacă
  // surrogate-pair sau prefix unicode emoji).
  const matches = s.match(/^\p{Extended_Pictographic}/u);
  return matches?.[0] ?? "";
}

function stripEmoji(s: string): string {
  return s.replace(/^\p{Extended_Pictographic}\s*/u, "").trim();
}
