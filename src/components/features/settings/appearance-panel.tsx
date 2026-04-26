"use client";

import { useEffect, useState } from "react";
import { Eye, MoonStar, Sun, Sunrise } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

const ACCESSIBILITY_KEYS = {
  largerText: "banii-a11y-larger-text",
  reduceMotion: "banii-a11y-reduce-motion",
  signsInsteadOfColor: "banii-a11y-signs",
} as const;

type AccessibilityState = {
  largerText: boolean;
  reduceMotion: boolean;
  signsInsteadOfColor: boolean;
};

function loadAccessibility(): AccessibilityState {
  if (typeof window === "undefined") {
    return {
      largerText: false,
      reduceMotion: false,
      signsInsteadOfColor: false,
    };
  }
  return {
    largerText: localStorage.getItem(ACCESSIBILITY_KEYS.largerText) === "1",
    reduceMotion:
      localStorage.getItem(ACCESSIBILITY_KEYS.reduceMotion) === "1",
    signsInsteadOfColor:
      localStorage.getItem(ACCESSIBILITY_KEYS.signsInsteadOfColor) === "1",
  };
}

function applyAccessibility(state: AccessibilityState) {
  const root = document.documentElement;
  root.classList.toggle("a11y-larger-text", state.largerText);
  root.classList.toggle("a11y-reduce-motion", state.reduceMotion);
  root.classList.toggle("a11y-signs", state.signsInsteadOfColor);
}

export function AppearancePanel() {
  const { theme, setTheme } = useTheme();
  const [a11y, setA11y] = useState<AccessibilityState>({
    largerText: false,
    reduceMotion: false,
    signsInsteadOfColor: false,
  });

  useEffect(() => {
    const loaded = loadAccessibility();
    applyAccessibility(loaded);
    const t = setTimeout(() => setA11y(loaded), 0);
    return () => clearTimeout(t);
  }, []);

  function toggle<K extends keyof AccessibilityState>(key: K) {
    const next = { ...a11y, [key]: !a11y[key] };
    setA11y(next);
    localStorage.setItem(ACCESSIBILITY_KEYS[key], next[key] ? "1" : "0");
    applyAccessibility(next);
  }

  return (
    <div className="space-y-6">
      <section className="border-border/60 bg-card rounded-xl border p-4">
        <h3 className="mb-3 text-sm font-semibold">Temă</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={theme === "dark" ? "default" : "outline"}
            onClick={() => setTheme("dark")}
          >
            <MoonStar className="mr-2 size-4" />
            Întuneric
          </Button>
          <Button
            size="sm"
            variant={theme === "light" ? "default" : "outline"}
            onClick={() => setTheme("light")}
          >
            <Sun className="mr-2 size-4" />
            Lumină
          </Button>
          <Button
            size="sm"
            variant={theme === "system" ? "default" : "outline"}
            onClick={() => setTheme("system")}
          >
            <Sunrise className="mr-2 size-4" />
            Sistem
          </Button>
        </div>
      </section>

      <section className="border-border/60 bg-card rounded-xl border p-4">
        <h3 className="mb-3 text-sm font-semibold">Accesibilitate</h3>
        <ul className="divide-y">
          <ToggleRow
            label="Text mai mare"
            description="Mărește font-ul la 110%."
            value={a11y.largerText}
            onToggle={() => toggle("largerText")}
          />
          <ToggleRow
            label="Reducere mișcare"
            description="Dezactivează animațiile și tranzițiile."
            value={a11y.reduceMotion}
            onToggle={() => toggle("reduceMotion")}
          />
          <ToggleRow
            label="Semne în loc de culoare"
            description="Adaugă +/- la sume; util pentru daltonism."
            value={a11y.signsInsteadOfColor}
            onToggle={() => toggle("signsInsteadOfColor")}
            icon={<Eye className="size-4" />}
          />
        </ul>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onToggle,
  icon,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between py-3">
      <div className="flex items-start gap-3">
        {icon ? <span className="text-muted-foreground mt-0.5">{icon}</span> : null}
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={value}
        className={`relative h-6 w-10 rounded-full transition ${
          value ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform ${
            value ? "translate-x-4" : ""
          }`}
        />
      </button>
    </li>
  );
}
