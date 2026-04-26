"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Delete } from "lucide-react";

import { cn } from "@/lib/utils";

const MAX_MINOR = 9_999_999_99; // 99.999.999,99

type Op = "+" | "-" | "*" | "/" | null;

type State = {
  /** Curent display: ce vede user-ul. */
  display: string;
  /** Operandul stocat înainte de operator. */
  stored: number | null;
  op: Op;
  /** True dacă următorul digit începe valoarea de la zero. */
  fresh: boolean;
};

type Props = {
  /** Valoare inițială (minor units). Component-ul devine UNCONTROLLED după mount. */
  defaultValue?: number;
  onChange: (minor: number) => void;
  onConfirm: () => void;
  className?: string;
};

function initFromMinor(minor: number): State {
  if (!Number.isFinite(minor) || minor <= 0) {
    return { display: "0", stored: null, op: null, fresh: true };
  }
  const major = minor / 100;
  return {
    display: major.toFixed(2).replace(".", ","),
    stored: null,
    op: null,
    fresh: false,
  };
}

function parseDisplay(d: string): number {
  if (!d) return 0;
  const normalized = d.replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function toMinor(major: number): number {
  return Math.min(MAX_MINOR, Math.max(0, Math.round(major * 100)));
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  // 2 zecimale, virgulă, fără separator de mii (mai compact pe display).
  return n.toFixed(2).replace(".", ",");
}

function applyOp(stored: number, op: Op, current: number): number {
  switch (op) {
    case "+":
      return stored + current;
    case "-":
      return stored - current;
    case "*":
      return stored * current;
    case "/":
      return current === 0 ? stored : stored / current;
    default:
      return current;
  }
}

export function NumericKeypad({
  defaultValue = 0,
  onChange,
  onConfirm,
  className,
}: Props) {
  // Uncontrolled: state inițial din defaultValue, după aceea owned de keypad.
  // Pentru reset (ex.: Salvează și încă unul) parent-ul re-mountează via `key`.
  const [state, setState] = useState<State>(() => initFromMinor(defaultValue));

  // Emite minor units când display-ul se schimbă (fără side-effects la mid-expr).
  useEffect(() => {
    if (state.op === null) {
      onChange(toMinor(parseDisplay(state.display)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.display]);

  const haptic = useCallback(() => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const pressDigit = useCallback((d: string) => {
    haptic();
    setState((s) => {
      let next = s.fresh ? d : s.display + d;
      // Leading zero: "0" + "5" → "5". Dar "0," + "5" → "0,5".
      if (s.fresh && d !== ",") next = d;
      if (next === "00") next = "0";
      // Max 2 decimale.
      const decIdx = next.indexOf(",");
      if (decIdx >= 0 && next.length - decIdx - 1 > 2) return s;
      // Limită maximă (în major units pre-2-decimal).
      const m = toMinor(parseDisplay(next));
      if (m > MAX_MINOR) return s;
      return { ...s, display: next, fresh: false };
    });
  }, [haptic]);

  const pressDecimal = useCallback(() => {
    haptic();
    setState((s) => {
      if (s.display.includes(",")) return s;
      const next = s.fresh ? "0," : s.display + ",";
      return { ...s, display: next, fresh: false };
    });
  }, [haptic]);

  const pressBackspace = useCallback(() => {
    haptic();
    setState((s) => {
      if (s.fresh) return s;
      const next = s.display.length <= 1 ? "0" : s.display.slice(0, -1);
      return { ...s, display: next, fresh: next === "0" };
    });
  }, [haptic]);

  const pressOp = useCallback((op: Op) => {
    haptic();
    setState((s) => {
      const current = parseDisplay(s.display);
      if (s.stored === null || s.op === null) {
        return { display: "0", stored: current, op, fresh: true };
      }
      // Lanț: 1 + 2 + 3 → la al doilea +, evaluăm 1+2=3 apoi setăm op.
      const result = applyOp(s.stored, s.op, current);
      return { display: "0", stored: result, op, fresh: true };
    });
  }, [haptic]);

  const pressEquals = useCallback(() => {
    haptic();
    setState((s) => {
      if (s.stored === null || s.op === null) return s;
      const current = parseDisplay(s.display);
      const result = applyOp(s.stored, s.op, current);
      return {
        display: formatNumber(result),
        stored: null,
        op: null,
        fresh: true,
      };
    });
  }, [haptic]);

  const handleConfirm = useCallback(() => {
    haptic();
    // Dacă suntem mid-expression, evaluăm întâi.
    setState((s) => {
      if (s.stored !== null && s.op !== null) {
        const current = parseDisplay(s.display);
        const result = applyOp(s.stored, s.op, current);
        const minor = toMinor(result);
        onChange(minor);
        return { display: formatNumber(result), stored: null, op: null, fresh: true };
      }
      const minor = toMinor(parseDisplay(s.display));
      onChange(minor);
      return s;
    });
    // onConfirm rulează după setState, dar React batch-uiește — ok să-l chemăm acum.
    setTimeout(onConfirm, 0);
  }, [haptic, onChange, onConfirm]);

  // Keyboard support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      const k = e.key;
      if (/^[0-9]$/.test(k)) {
        e.preventDefault();
        pressDigit(k);
      } else if (k === "," || k === ".") {
        e.preventDefault();
        pressDecimal();
      } else if (k === "Backspace") {
        e.preventDefault();
        pressBackspace();
      } else if (k === "+" || k === "-" || k === "*" || k === "/") {
        e.preventDefault();
        pressOp(k);
      } else if (k === "=" || k === "Enter") {
        e.preventDefault();
        if (state.op !== null) pressEquals();
        else handleConfirm();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    pressDigit,
    pressDecimal,
    pressBackspace,
    pressOp,
    pressEquals,
    handleConfirm,
    state.op,
  ]);

  const opLabel = state.op === "*" ? "×" : state.op === "/" ? "÷" : state.op ?? "";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="text-center">
        {state.stored !== null && state.op !== null ? (
          <div className="text-muted-foreground text-xs tabular-nums">
            {formatNumber(state.stored)} {opLabel}
          </div>
        ) : null}
        <div className="text-5xl font-semibold tabular-nums slashed-zero">
          {state.display}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <KeyOp label="+" active={state.op === "+"} onPress={() => pressOp("+")} />
        <KeyOp label="−" active={state.op === "-"} onPress={() => pressOp("-")} />
        <KeyOp label="×" active={state.op === "*"} onPress={() => pressOp("*")} />
        <KeyOp label="÷" active={state.op === "/"} onPress={() => pressOp("/")} />

        <Key label="7" onPress={() => pressDigit("7")} />
        <Key label="8" onPress={() => pressDigit("8")} />
        <Key label="9" onPress={() => pressDigit("9")} />
        <KeyAccent
          aria-label="Șterge"
          onPress={pressBackspace}
        >
          <Delete className="size-5" aria-hidden />
        </KeyAccent>

        <Key label="4" onPress={() => pressDigit("4")} />
        <Key label="5" onPress={() => pressDigit("5")} />
        <Key label="6" onPress={() => pressDigit("6")} />
        <KeyOp label="=" onPress={pressEquals} />

        <Key label="1" onPress={() => pressDigit("1")} />
        <Key label="2" onPress={() => pressDigit("2")} />
        <Key label="3" onPress={() => pressDigit("3")} />
        <KeyConfirm
          aria-label="Confirmă"
          onPress={handleConfirm}
        >
          <Check className="size-5" aria-hidden />
        </KeyConfirm>

        <Key label="," onPress={pressDecimal} />
        <Key
          label="0"
          className="col-span-2"
          onPress={() => pressDigit("0")}
        />
        <Key label="." onPress={pressDecimal} />
      </div>
    </div>
  );
}

const baseKeyClass =
  "flex h-14 min-h-14 items-center justify-center rounded-xl text-xl font-medium tabular-nums transition active:scale-[0.96] select-none touch-manipulation";

function Key({
  label,
  className,
  onPress,
}: {
  label: string;
  className?: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        baseKeyClass,
        "bg-card hover:bg-accent border-border/60 border",
        className,
      )}
    >
      {label}
    </button>
  );
}

function KeyOp({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={active}
      className={cn(
        baseKeyClass,
        "border-border/60 border text-base",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}

function KeyAccent({
  children,
  onPress,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      {...rest}
      className={cn(
        baseKeyClass,
        "bg-muted/50 hover:bg-accent border-border/60 border",
      )}
    >
      {children}
    </button>
  );
}

function KeyConfirm({
  children,
  onPress,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      {...rest}
      className={cn(
        baseKeyClass,
        "bg-emerald-500 hover:bg-emerald-600 text-white",
      )}
    >
      {children}
    </button>
  );
}
