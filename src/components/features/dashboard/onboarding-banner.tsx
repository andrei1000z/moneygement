"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { seedDemoData } from "@/app/(dashboard)/onboarding/actions";
import { Button } from "@/components/ui/button";

export function OnboardingBanner() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  function tryDemo() {
    start(async () => {
      const res = await seedDemoData();
      if (!res.ok) {
        toast.error("Demo seed eșuat", { description: res.error });
        return;
      }
      toast.success("Date demo create", {
        description: `${res.data.accounts} conturi · ${res.data.transactions} tranzacții · ${res.data.budgets} bugete · ${res.data.goals} goal`,
      });
      router.refresh();
    });
  }

  if (dismissed) return null;

  return (
    <div className="glass-strong rounded-(--radius-card) overflow-hidden p-5">
      <div className="flex items-start gap-4">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklch, var(--accent-blue), transparent 65%), color-mix(in oklch, var(--accent-yellow), transparent 70%))",
          }}
        >
          <Sparkles className="text-(--accent-blue) size-6" aria-hidden strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Bun venit în Banii
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Adaugă primul cont și începi să-ți urmărești cheltuielile, sau
            populează cu date demo să vezi cum arată aplicația cu cifre reale.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="eu">
              <Link href="/accounts">
                <Plus className="mr-2 size-4" /> Adaugă primul cont
              </Link>
            </Button>
            <Button
              variant="yellow"
              onClick={tryDemo}
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Populez…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Populează cu date demo
                </>
              )}
            </Button>
            <Button variant="ghost" onClick={() => setDismissed(true)}>
              Mai târziu
            </Button>
          </div>
          <p className="text-muted-foreground mt-3 text-[11px]">
            Demo: 3 conturi · 80 tranzacții pe 90 zile cu merchanți români ·
            4 bugete pe luna curentă · 1 goal de călătorie. Le poți șterge
            oricând din /settings.
          </p>
        </div>
      </div>
    </div>
  );
}
