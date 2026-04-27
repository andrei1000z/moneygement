"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  updateNotificationPrefs,
  type NotificationPrefsInput,
} from "@/app/(dashboard)/settings/notification-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";

type Props = {
  initial: NotificationPrefsInput;
};

const TOGGLES: Array<{ key: keyof NotificationPrefsInput; label: string; description: string }> = [
  {
    key: "push_weekly_recap",
    label: "Recap săptămânal",
    description: "Luni dimineața — un rezumat cu 4 bullets.",
  },
  {
    key: "push_bills",
    label: "Plăți recurente",
    description: "Cu 1 zi înainte de o plată programată.",
  },
  {
    key: "push_low_balance",
    label: "Sold scăzut",
    description: "Când un cont scade sub pragul setat.",
  },
  {
    key: "push_bank_reauth",
    label: "Reautentificare bancară",
    description: "Cu 7 zile înainte de expirarea consimțământului.",
  },
  {
    key: "push_goal_milestones",
    label: "Pragurile obiectivelor",
    description: "La fiecare 25%, 50%, 75% și 100%.",
  },
  {
    key: "push_anomalies",
    label: "Tranzacții neobișnuite",
    description: "Spike statistic față de mediana categoriei.",
  },
  {
    key: "push_anniversaries",
    label: "„Acum un an…&rdquo;",
    description: "Memento ce ai cheltuit cu un an în urmă.",
  },
];

export function NotificationsPanel({ initial }: Props) {
  const [state, setState] = useState<NotificationPrefsInput>(initial);
  const [pending, start] = useTransition();
  const [thresholdInput, setThresholdInput] = useState<string>(
    (state.low_balance_threshold_minor / 100)
      .toFixed(2)
      .replace(".", ","),
  );

  function setToggle(key: keyof NotificationPrefsInput, value: boolean) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function save() {
    start(async () => {
      const cleaned = thresholdInput.replace(/\s+/g, "").replace(/,/g, ".");
      const num = Number.parseFloat(cleaned);
      const minor = Number.isFinite(num)
        ? Math.max(0, Math.round(num * 100))
        : state.low_balance_threshold_minor;
      const next = {
        ...state,
        low_balance_threshold_minor: minor,
      };
      const res = await updateNotificationPrefs(next);
      if (!res.ok) toast.error(res.error);
      else {
        setState(next);
        toast.success("Preferințe salvate");
      }
    });
  }

  return (
    <div className="space-y-4">
      <section className="glass-thin rounded-[--radius-card]">
        <h3 className="border-b px-4 py-3 text-sm font-semibold">
          Tipuri notificări
        </h3>
        <ul className="divide-y">
          {TOGGLES.map((t) => (
            <li key={t.key} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-muted-foreground text-xs">
                  {t.description}
                </p>
              </div>
              <button
                type="button"
                aria-pressed={Boolean(state[t.key])}
                onClick={() =>
                  setToggle(t.key, !state[t.key])
                }
                className={`relative h-6 w-10 shrink-0 rounded-full transition ${
                  state[t.key] ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform ${
                    state[t.key] ? "translate-x-4" : ""
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-thin space-y-3 rounded-[--radius-card] p-4">
        <h3 className="text-sm font-semibold">Quiet hours</h3>
        <p className="text-muted-foreground text-xs">
          În acest interval nu primești push-uri (cu excepția chat-ului).
        </p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-muted-foreground mb-1 block text-xs uppercase tracking-wider">
              De la
            </label>
            <Input
              type="time"
              value={state.quiet_start ?? ""}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  quiet_start: e.target.value || null,
                }))
              }
            />
          </div>
          <div className="flex-1">
            <label className="text-muted-foreground mb-1 block text-xs uppercase tracking-wider">
              Până la
            </label>
            <Input
              type="time"
              value={state.quiet_end ?? ""}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  quiet_end: e.target.value || null,
                }))
              }
            />
          </div>
        </div>
      </section>

      <section className="glass-thin rounded-[--radius-card] p-4">
        <h3 className="text-sm font-semibold">Prag „sold scăzut&rdquo;</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Notificare când un cont scade sub această sumă.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Input
            type="text"
            inputMode="decimal"
            value={thresholdInput}
            onChange={(e) => setThresholdInput(e.target.value)}
            className="max-w-[160px]"
          />
          <span className="text-muted-foreground text-xs tabular-nums">
            ≈ {formatMoney(state.low_balance_threshold_minor, "RON")}
          </span>
        </div>
      </section>

      <Button onClick={save} disabled={pending}>
        {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Salvează
      </Button>
    </div>
  );
}
