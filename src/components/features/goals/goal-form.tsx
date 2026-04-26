"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import {
  createGoal,
  goalInputSchema,
  updateGoal,
  type GoalInput,
} from "@/app/(dashboard)/goals/actions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useInvalidateGoals, type GoalRow } from "@/hooks/use-goals";
import { cn } from "@/lib/utils";

const POPULAR_EMOJIS = [
  "🏖️",
  "🏠",
  "🚗",
  "💍",
  "🎓",
  "👶",
  "💻",
  "📱",
  "🎁",
  "✈️",
  "💰",
  "🐷",
  "💳",
  "🎯",
];

const BUCKETS: {
  value: GoalInput["bucket_type"];
  label: string;
  description: string;
}[] = [
  {
    value: "standard",
    label: "Standard",
    description: "Doar parcare bani, fără țintă fixă.",
  },
  {
    value: "goal",
    label: "Goal",
    description: "Țintă cu dată limită.",
  },
  {
    value: "monthly",
    label: "Monthly",
    description: "Auto-fill lunar (ex: chirie viitoare).",
  },
  {
    value: "goal_monthly",
    label: "Goal-Monthly",
    description: "Țintă + auto-contribuții lunare.",
  },
  {
    value: "debt",
    label: "Datorie",
    description: "Plată datorie cu strategie snowball / avalanche.",
  },
];

type FormValues = z.infer<typeof goalInputSchema>;

type Props = {
  goal?: GoalRow | null;
  onDone?: () => void;
};

export function GoalForm({ goal, onDone }: Props) {
  const isEdit = !!goal;
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const invalidate = useInvalidateGoals();
  const { data: accounts } = useAccounts({ archived: false });
  const { data: categories } = useCategories();

  const initialEmoji = extractEmoji(goal?.name ?? "") || "🎯";
  const initialName = stripEmoji(goal?.name ?? "");

  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState(initialEmoji);
  const [target, setTarget] = useState<number | null>(
    goal?.target_amount ?? null,
  );
  const [targetDate, setTargetDate] = useState<string>(
    goal?.target_date ?? "",
  );
  const [bucket, setBucket] = useState<FormValues["bucket_type"]>(
    goal?.bucket_type ?? "goal",
  );
  const [accountId, setAccountId] = useState<string | null>(
    goal?.account_id ?? null,
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    goal?.category_id ?? null,
  );
  const [currency, setCurrency] = useState(goal?.currency ?? "RON");

  function next() {
    if (step === 1 && name.trim().length === 0) {
      toast.error("Nume gol");
      return;
    }
    if (step === 2 && (!target || target <= 0)) {
      toast.error("Sumă-țintă invalidă");
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  }

  function submit() {
    const input: GoalInput = {
      name: `${emoji} ${name.trim()}`.trim(),
      target_amount: target ?? 0,
      currency,
      target_date: targetDate || null,
      account_id: accountId,
      category_id: categoryId,
      bucket_type: bucket,
    };
    startTransition(async () => {
      const r = isEdit
        ? await updateGoal(goal!.id, input)
        : await createGoal(input);
      if (!r.ok) {
        toast.error(isEdit ? "Salvare eșuată" : "Creare eșuată", {
          description: r.error,
        });
        return;
      }
      toast.success(isEdit ? "Goal actualizat" : "Goal creat");
      await invalidate();
      onDone?.();
    });
  }

  return (
    <div className="space-y-5">
      <Stepper step={step} />

      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="goal-name">
              Nume
            </label>
            <Input
              id="goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Vacanță Grecia"
              autoFocus
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium">Emoji</span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_EMOJIS.map((e) => (
                <button
                  type="button"
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border text-lg",
                    emoji === e
                      ? "border-foreground bg-accent"
                      : "border-border hover:bg-accent/50",
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="goal-target">
              Sumă-țintă
            </label>
            <CurrencyInput
              id="goal-target"
              value={target}
              onChange={(v) => setTarget(v)}
              currency={currency}
              allowNegative={false}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="goal-date">
              Dată-limită (opțional)
            </label>
            <Input
              id="goal-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="goal-cur">
              Monedă
            </label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="goal-cur">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["RON", "EUR", "USD", "GBP", "CHF"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div>
            <span className="mb-2 block text-xs font-medium">Tip goal</span>
            <ul className="space-y-2">
              {BUCKETS.map((b) => (
                <li key={b.value}>
                  <button
                    type="button"
                    onClick={() => setBucket(b.value)}
                    className={cn(
                      "border-border/60 hover:bg-accent/40 w-full rounded-lg border p-3 text-left transition",
                      bucket === b.value && "border-foreground bg-accent",
                    )}
                  >
                    <p className="text-sm font-medium">{b.label}</p>
                    <p className="text-muted-foreground text-xs">
                      {b.description}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium" htmlFor="goal-acc">
                Cont sursă (opțional)
              </label>
              <Select
                value={accountId ?? "__none__"}
                onValueChange={(v) =>
                  setAccountId(v === "__none__" ? null : v)
                }
              >
                <SelectTrigger id="goal-acc">
                  <SelectValue placeholder="Niciunul" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— niciunul</SelectItem>
                  {(accounts ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.icon ? `${a.icon} ` : ""}
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" htmlFor="goal-cat">
                Categorie (opțional)
              </label>
              <Select
                value={categoryId ?? "__none__"}
                onValueChange={(v) =>
                  setCategoryId(v === "__none__" ? null : v)
                }
              >
                <SelectTrigger id="goal-cat">
                  <SelectValue placeholder="Niciuna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— niciuna</SelectItem>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ` : ""}
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 pt-2">
        {step > 1 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={pending}
          >
            <ArrowLeft className="size-4" aria-hidden /> Înapoi
          </Button>
        ) : (
          <span />
        )}
        {step < 3 ? (
          <Button onClick={next} disabled={pending}>
            Continuă <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button onClick={submit} disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : isEdit ? (
              "Salvează modificările"
            ) : (
              "Crează goal"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2">
      {[1, 2, 3].map((i) => (
        <li
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition",
            i <= step ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </ol>
  );
}

function extractEmoji(s: string): string {
  return s.match(/^\p{Extended_Pictographic}/u)?.[0] ?? "";
}

function stripEmoji(s: string): string {
  return s.replace(/^\p{Extended_Pictographic}\s*/u, "").trim();
}
