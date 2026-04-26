"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  completeGoal,
  deleteGoal,
} from "@/app/(dashboard)/goals/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useInvalidateGoals, type GoalRow } from "@/hooks/use-goals";
import { formatMoney } from "@/lib/money";

import { GoalForm } from "./goal-form";

type Props = {
  goal: GoalRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GoalDetail({ goal, open, onOpenChange }: Props) {
  const [tab, setTab] = useState("progress");
  const [pending, startTransition] = useTransition();
  const invalidate = useInvalidateGoals();

  function handleDelete() {
    if (!goal) return;
    startTransition(async () => {
      const r = await deleteGoal(goal.id);
      if (!r.ok) {
        toast.error("Ștergere eșuată", { description: r.error });
        return;
      }
      toast.success("Goal șters");
      await invalidate();
      onOpenChange(false);
    });
  }

  function handleArchive() {
    if (!goal) return;
    startTransition(async () => {
      const r = await completeGoal(goal.id);
      if (!r.ok) {
        toast.error("Eroare", { description: r.error });
        return;
      }
      toast.success("Goal arhivat");
      await invalidate();
      onOpenChange(false);
    });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90svh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>{goal?.name ?? "Detalii goal"}</DrawerTitle>
        </DrawerHeader>
        {goal ? (
          <Tabs
            value={tab}
            onValueChange={setTab}
            className="overflow-y-auto px-4 pb-6"
          >
            <TabsList>
              <TabsTrigger value="progress">Progres</TabsTrigger>
              <TabsTrigger value="settings">Setări</TabsTrigger>
            </TabsList>

            <TabsContent value="progress" className="space-y-3 py-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat
                  label="Curent"
                  value={formatMoney(goal.current_amount, goal.currency)}
                />
                <Stat
                  label="Țintă"
                  value={formatMoney(goal.target_amount, goal.currency)}
                />
                {goal.target_date ? (
                  <Stat
                    label="Dată-limită"
                    value={format(parseISO(goal.target_date), "d MMM yyyy", {
                      locale: ro,
                    })}
                  />
                ) : null}
                <Stat
                  label="Rest până la țintă"
                  value={formatMoney(
                    Math.max(0, goal.target_amount - goal.current_amount),
                    goal.currency,
                  )}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Istoricul de contribuții individuale apare în Faza 6 (cu o
                tabelă dedicată); momentan urmărim doar `current_amount`.
              </p>
            </TabsContent>

            <TabsContent value="settings" className="space-y-3 py-3">
              <GoalForm
                goal={goal}
                onDone={() => onOpenChange(false)}
              />

              <div className="border-border/60 bg-muted/30 mt-4 flex flex-col gap-2 rounded-lg border p-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleArchive}
                  disabled={pending}
                >
                  Arhivează (marchează completat)
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={pending}
                    >
                      <Trash2 className="size-4" aria-hidden /> Șterge goal
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Ștergi goal-ul?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Acțiunea nu poate fi anulată.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Renunță</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>
                        Șterge
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border/60 bg-card rounded-lg border p-3">
      <dt className="text-muted-foreground text-[10px] uppercase tracking-wider">
        {label}
      </dt>
      <dd className="text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
