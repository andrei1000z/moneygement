"use client";

import { useMemo, useState } from "react";
import { Plus, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoals, type GoalRow } from "@/hooks/use-goals";

import { GoalCard } from "./goal-card";
import { GoalCelebration } from "./goal-celebration";
import { GoalDetail } from "./goal-detail";
import { GoalForm } from "./goal-form";

type View = "active" | "completed";

export function GoalsScreen() {
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
            <div className="border-border/60 bg-card/40 flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
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
