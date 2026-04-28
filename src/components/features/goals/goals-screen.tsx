"use client";

import { useMemo, useState, useTransition } from "react";
import { Coins, Plus, Target } from "lucide-react";
import { toast } from "sonner";

import { setRoundupGoal } from "@/app/(dashboard)/goals/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoals, type GoalRow } from "@/hooks/use-goals";
import { formatMoney } from "@/lib/money";

import { GoalCard } from "./goal-card";
import { GoalCelebration } from "./goal-celebration";
import { GoalDetail } from "./goal-detail";
import { GoalForm } from "./goal-form";

type View = "active" | "completed";

type RoundupInitial = {
  roundup_goal_id: string | null;
  roundup_active: boolean;
  base_currency: string;
};

type Props = {
  householdInitial?: RoundupInitial;
  roundupThisMonth?: number;
};

export function GoalsScreen({
  householdInitial,
  roundupThisMonth = 0,
}: Props = {}) {
  const [view, setView] = useState<View>("active");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detail, setDetail] = useState<GoalRow | null>(null);
  const [celebration, setCelebration] = useState<{
    name: string;
    trigger: number;
  } | null>(null);

  const { data, isLoading } = useGoals({ archived: view === "completed" });

  const sorted = useMemo(() => {
    const list = [...(data ?? [])];
    list.sort((a, b) => {
      const aPct = a.target_amount > 0 ? a.current_amount / a.target_amount : 0;
      const bPct = b.target_amount > 0 ? b.current_amount / b.target_amount : 0;
      return bPct - aPct;
    });
    return list;
  }, [data]);

  function handleReached(g: GoalRow) {
    setCelebration({ name: g.name, trigger: Date.now() });
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 md:px-8 md:py-10">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
            Obiective
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Ce strângi pentru…
          </h1>
        </div>
        <Button onClick={() => setSheetOpen(true)} className="shrink-0">
          <Plus className="size-4" aria-hidden /> Goal nou
        </Button>
      </header>

      {householdInitial ? (
        <RoundupSection
          initial={householdInitial}
          roundupThisMonth={roundupThisMonth}
          goals={(data ?? []).filter((g) => !g.archived_at)}
        />
      ) : null}

      <Tabs value={view} onValueChange={(v) => setView(v as View)}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completate</TabsTrigger>
        </TabsList>

        <TabsContent value={view}>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="glass-thin flex flex-col items-center justify-center rounded-(--radius-card) border-dashed p-10 text-center">
              <div className="bg-accent text-accent-foreground mb-4 flex size-12 items-center justify-center rounded-full">
                <Target className="size-5" aria-hidden />
              </div>
              <h3 className="text-base font-semibold">
                {view === "active" ? "Niciun goal activ" : "Niciun goal completat"}
              </h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                {view === "active"
                  ? "Setează un goal — vacanță, schimb auto, fond pentru zile negre."
                  : "Goalurile arhivate apar aici."}
              </p>
              {view === "active" ? (
                <Button onClick={() => setSheetOpen(true)} className="mt-5">
                  <Plus className="size-4" aria-hidden /> Primul goal
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sorted.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  onClick={(g) => setDetail(g)}
                  onReached={handleReached}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md"
        >
          <SheetHeader className="border-b">
            <SheetTitle>Goal nou</SheetTitle>
            <SheetDescription>3 pași: nume, sumă, tip.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-5">
            {sheetOpen ? (
              <GoalForm onDone={() => setSheetOpen(false)} />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <GoalDetail
        goal={detail}
        open={!!detail}
        onOpenChange={(v) => setDetail(v ? detail : null)}
      />

      {celebration ? (
        <GoalCelebration
          goalName={celebration.name}
          trigger={celebration.trigger}
        />
      ) : null}
    </div>
  );
}

function RoundupSection({
  initial,
  roundupThisMonth,
  goals,
}: {
  initial: RoundupInitial;
  roundupThisMonth: number;
  goals: GoalRow[];
}) {
  const [active, setActive] = useState(initial.roundup_active);
  const [goalId, setGoalId] = useState<string | null>(initial.roundup_goal_id);
  const [pending, start] = useTransition();

  function applyChange(next: { active?: boolean; goalId?: string | null }) {
    const newActive = next.active ?? active;
    const newGoalId = next.goalId !== undefined ? next.goalId : goalId;
    const targetGoal = newActive ? newGoalId : null;
    setActive(newActive);
    setGoalId(newGoalId);
    start(async () => {
      const r = await setRoundupGoal(targetGoal);
      if (!r.ok) {
        toast.error("Setare eșuată", { description: r.error });
        // Revert
        setActive(initial.roundup_active);
        setGoalId(initial.roundup_goal_id);
        return;
      }
      toast.success(targetGoal ? "Rotunjiri activate" : "Rotunjiri dezactivate");
    });
  }

  return (
    <section className="glass-thin rounded-(--radius-card) p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="bg-(--accent-yellow)/15 text-(--accent-blue) flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Coins className="size-5" aria-hidden strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-base font-semibold">Smart round-ups</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Fiecare cheltuială se rotunjește la următorul leu, diferența merge
              spre goal-ul ales.
            </p>
          </div>
        </div>
        <Switch
          checked={active}
          onCheckedChange={(v) => applyChange({ active: v })}
          disabled={pending || (active === false && goals.length === 0)}
          aria-label="Activează rotunjiri"
        />
      </div>

      {active ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:items-end">
          <div>
            <label
              htmlFor="roundup-goal"
              className="text-muted-foreground mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em]"
            >
              Goal pentru rotunjiri
            </label>
            <Select
              value={goalId ?? ""}
              onValueChange={(v) => applyChange({ goalId: v || null })}
              disabled={pending || goals.length === 0}
            >
              <SelectTrigger id="roundup-goal">
                <SelectValue placeholder="Alege un goal…" />
              </SelectTrigger>
              <SelectContent>
                {goals.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {goals.length === 0 ? (
              <p className="text-muted-foreground mt-1 text-xs">
                Crează un goal mai întâi.
              </p>
            ) : null}
          </div>

          <div className="bg-(--surface-tint-faint) rounded-xl px-3 py-2.5">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.15em]">
              Adunat luna asta
            </p>
            <p className="num-hero mt-0.5 text-lg font-semibold tracking-tight">
              {formatMoney(roundupThisMonth, initial.base_currency)}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              estimat din cheltuieli manuale
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
