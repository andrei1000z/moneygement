"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eraser, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  clearDemoData,
  seedDemoData,
} from "@/app/(dashboard)/onboarding/actions";
import { Button } from "@/components/ui/button";

type Props = {
  hasAccounts: boolean;
};

export function DemoDataPanel({ hasAccounts }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function seed() {
    start(async () => {
      const r = await seedDemoData();
      if (!r.ok) {
        toast.error("Demo seed eșuat", { description: r.error });
        return;
      }
      toast.success("Demo data inserat", {
        description: `${r.data.accounts} conturi · ${r.data.transactions} tranzacții · ${r.data.budgets} bugete · ${r.data.goals} goal`,
      });
      router.refresh();
    });
  }

  function clear() {
    if (
      !confirm(
        "ATENȚIE — acțiune ireversibilă. Șterg TOATE conturile, tranzacțiile, bugetele și goal-urile gospodăriei. Continui?",
      )
    )
      return;
    start(async () => {
      const r = await clearDemoData();
      if (!r.ok) {
        toast.error("Ștergere eșuată", { description: r.error });
        return;
      }
      toast.success("Date șterse complet");
      router.refresh();
    });
  }

  return (
    <section className="glass-thin rounded-(--radius-card) p-5">
      <div className="flex items-start gap-3">
        <div className="bg-(--accent-yellow)/15 text-(--accent-blue) flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Sparkles className="size-5" aria-hidden strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold">Date demo</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {hasAccounts
              ? "Ai deja date. Poți șterge tot dacă vrei să pornești de la zero (irreversibil)."
              : "Populează gospodăria cu 3 conturi, 80 tranzacții pe 90 zile, 4 bugete și 1 goal. Util pentru a explora aplicația."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!hasAccounts ? (
              <Button variant="yellow" onClick={seed} disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Populez…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" /> Populează cu date demo
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={clear}
                disabled={pending}
                className="text-destructive hover:text-destructive"
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Șterg…
                  </>
                ) : (
                  <>
                    <Eraser className="mr-2 size-4" /> Șterge toate datele
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
