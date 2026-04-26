"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  createPreset,
  deletePreset,
  type PresetInput,
} from "@/app/(dashboard)/actions/presets";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useInvalidatePresets, type PresetRow } from "@/hooks/use-presets";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  presets: PresetRow[];
  onApply: (preset: PresetRow) => void;
};

export function PresetBar({ presets, onApply }: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PresetRow | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();
  const invalidate = useInvalidatePresets();

  function startLongPress(p: PresetRow) {
    longPressTimer.current = setTimeout(() => setConfirmDelete(p), 500);
  }
  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleDelete() {
    if (!confirmDelete) return;
    startTransition(async () => {
      const r = await deletePreset(confirmDelete.id);
      if (!r.ok) {
        toast.error("Ștergere eșuată", { description: r.error });
        return;
      }
      toast.success("Preset șters");
      await invalidate();
      setConfirmDelete(null);
    });
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onApply(p)}
            onPointerDown={() => startLongPress(p)}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            className={cn(
              "border-border/60 bg-card hover:bg-accent flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-center transition active:scale-95",
            )}
          >
            <span className="text-xl leading-none" aria-hidden>
              {p.emoji ?? "💸"}
            </span>
            <span className="text-xs font-medium leading-tight">{p.label}</span>
            <span className="text-muted-foreground text-[10px] tabular-nums">
              {formatMoney(p.amount, p.currency)}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setEditorOpen(true)}
          className="border-border/60 bg-card hover:bg-accent flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-2 text-xs"
        >
          <Plus className="size-4" aria-hidden />
          Preset
        </button>
      </div>

      <PresetEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onCreated={invalidate}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Șterge preset-ul „{confirmDelete?.label}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Acțiunea nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Renunță</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={pending}>
              <Trash2 className="size-4" aria-hidden /> Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const POPULAR_EMOJIS = [
  "☕",
  "🍔",
  "🍕",
  "🚌",
  "⛽",
  "🛒",
  "🎁",
  "🎬",
  "💊",
  "🚕",
  "📱",
  "🏠",
];

function PresetEditor({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("☕");
  const [amount, setAmount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setLabel("");
    setEmoji("☕");
    setAmount(null);
  }

  function submit() {
    if (label.trim().length === 0) {
      toast.error("Label gol");
      return;
    }
    if (amount === null || amount <= 0) {
      toast.error("Sumă obligatorie");
      return;
    }
    startTransition(async () => {
      const input: PresetInput = {
        label: label.trim(),
        emoji,
        amount,
        currency: "RON",
      };
      const r = await createPreset(input);
      if (!r.ok) {
        toast.error("Creare eșuată", { description: r.error });
        return;
      }
      toast.success("Preset adăugat");
      onCreated();
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Preset nou</DialogTitle>
          <DialogDescription>
            Cheltuieli frecvente cu un singur tap.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="preset-label">
              Nume
            </label>
            <Input
              id="preset-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex: Cafea, Prânz"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium">Emoji</span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
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
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="preset-amount">
              Sumă
            </label>
            <CurrencyInput
              id="preset-amount"
              value={amount}
              onChange={setAmount}
              currency="RON"
              allowNegative={false}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="size-4" aria-hidden /> Renunță
          </Button>
          <Button onClick={submit} disabled={pending}>
            Salvează preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
