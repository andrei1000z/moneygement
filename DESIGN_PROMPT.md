# DESIGN_PROMPT.md — Liquid Glass iOS pentru Banii

> **Cum folosești:** deschide Claude Code în `C:\Users\Andrei\Desktop\banii`, copiază
> conținutul de mai jos (de la "Citește în ordine..." până la sfârșit) și lipește-l ca
> prim mesaj. Claude Code va transforma designul complet în iOS Liquid Glass
> cu glow, animații, glassmorphism, fără să atingă logica.
>
> **Înainte să rulezi:**
> 1. `git status` — clean working tree
> 2. `git checkout -b design/liquid-glass`
> 3. Asigură-te că `npm run typecheck` și `npm run lint` sunt clean (sunt deja
>    conform AUDIT.md)

---

```
Citește în ordine: BLUEPRINT.md, CLAUDE.md, AGENTS.md, AUDIT.md.

MISIUNE: Transformi designul Banii din shadcn default monochrome flat într-un
sistem iOS Liquid Glass / Glassmorphism premium cu glow, mesh gradients,
spring animations, depth, și polish maxim. NU schimbi logica. NU strici tipurile.
NU modifici migrațiile. Doar layer-ul vizual: globals.css + tokens + componente UI
+ feature components.

PRINCIPII NEGOCIABILE:
- Calm și premium, NU disco. Glow-urile sunt subtile, gradient-urile lente,
  blur-urile mari (40-80px). NU pulsează agresiv, NU folosește >2 culori
  saturate per ecran simultan.
- iOS Liquid Glass = backdrop-blur(40px) + saturate(180%) + brightness(110%)
  + border interior subtil + shadow ambient + occasional glow halo.
- Performanță: zero filter pe scroll-target-uri (folosește variabile CSS și
  apply pe wrapper, nu pe element-care-scroll-uiește). Test pe mobil real.
- Accesibilitate: păstrezi a11y existent. `prefers-reduced-motion` dezactivează
  animațiile floating și mesh-ul ambient; păstrează doar tranzițiile de stare.
- Toate culorile prin CSS variables în @theme — niciodată hex direct în clase
  (cu excepția gradient-urilor unde e necesar).

═══════════════════════════════════════════════════════════════════════════
ETAPA 1 — Design tokens (globals.css + theme variables)
═══════════════════════════════════════════════════════════════════════════

1.1. În `src/app/globals.css`, înlocuiește ÎN ÎNTREGIME blocurile `:root` și
     `.dark` cu paletele de mai jos. Păstrează @theme inline existent dar
     adaugă variabilele noi de glass.

DARK MODE (default — este principal):
```css
.dark {
  /* Background layers — radial mesh ambient */
  --bg-base: oklch(0.14 0.018 265);
  --bg-elevated: oklch(0.18 0.022 265);
  --bg-overlay: oklch(0.22 0.025 265);

  /* Foreground */
  --foreground: oklch(0.985 0 0);
  --muted-foreground: oklch(0.72 0.015 260);

  /* Accent palette — Aurora */
  --accent-emerald: oklch(0.78 0.18 162);   /* #10b981-ish but punchier */
  --accent-violet:  oklch(0.72 0.22 295);   /* iOS purple */
  --accent-cyan:    oklch(0.82 0.16 215);   /* glacier blue */
  --accent-pink:    oklch(0.76 0.22 350);   /* hint rose */
  --accent-amber:   oklch(0.82 0.17 75);    /* warning warm */

  /* Surfaces — translucent for glass */
  --glass-base: oklch(0.22 0.02 265 / 0.6);   /* card translucent */
  --glass-elevated: oklch(0.28 0.025 265 / 0.7);
  --glass-strong: oklch(0.32 0.03 265 / 0.85);
  --glass-border: oklch(1 0 0 / 0.08);
  --glass-border-hi: oklch(1 0 0 / 0.16);   /* highlight inner top */
  --glass-shadow: oklch(0 0 0 / 0.4);

  /* Compatibility cu shadcn — păstrează semantica */
  --background: var(--bg-base);
  --card: var(--glass-base);
  --card-foreground: var(--foreground);
  --popover: var(--glass-elevated);
  --popover-foreground: var(--foreground);
  --primary: var(--accent-emerald);
  --primary-foreground: oklch(0.12 0.01 265);
  --secondary: var(--glass-base);
  --secondary-foreground: var(--foreground);
  --muted: var(--glass-base);
  --accent: var(--glass-elevated);
  --accent-foreground: var(--foreground);
  --destructive: oklch(0.7 0.22 22);
  --border: var(--glass-border);
  --input: var(--glass-elevated);
  --ring: var(--accent-emerald);

  /* Charts */
  --chart-1: var(--accent-emerald);
  --chart-2: var(--accent-violet);
  --chart-3: var(--accent-cyan);
  --chart-4: var(--accent-pink);
  --chart-5: var(--accent-amber);

  /* Radius — iOS preferă 16-20px pe card, 32px pe sheet */
  --radius: 1rem;          /* 16px */
  --radius-card: 1.25rem;  /* 20px */
  --radius-sheet: 2rem;    /* 32px */
  --radius-pill: 999px;

  /* Sidebar (păstrează compat) */
  --sidebar: var(--glass-base);
  --sidebar-foreground: var(--foreground);
  --sidebar-primary: var(--accent-emerald);
  --sidebar-primary-foreground: oklch(0.12 0.01 265);
  --sidebar-accent: var(--glass-elevated);
  --sidebar-accent-foreground: var(--foreground);
  --sidebar-border: var(--glass-border);
  --sidebar-ring: var(--accent-emerald);
}
```

LIGHT MODE (warm white, NU pure white):
```css
:root {
  --bg-base: oklch(0.98 0.005 80);          /* warm off-white */
  --bg-elevated: oklch(1 0 0);
  --bg-overlay: oklch(0.96 0.008 75);
  --foreground: oklch(0.18 0.01 265);
  --muted-foreground: oklch(0.5 0.012 260);
  --accent-emerald: oklch(0.62 0.18 162);
  --accent-violet:  oklch(0.55 0.22 295);
  --accent-cyan:    oklch(0.62 0.16 215);
  --accent-pink:    oklch(0.6 0.22 350);
  --accent-amber:   oklch(0.7 0.17 75);

  --glass-base: oklch(1 0 0 / 0.65);
  --glass-elevated: oklch(1 0 0 / 0.85);
  --glass-strong: oklch(1 0 0 / 0.95);
  --glass-border: oklch(0.18 0.01 265 / 0.08);
  --glass-border-hi: oklch(1 0 0 / 0.6);
  --glass-shadow: oklch(0.18 0.01 265 / 0.08);

  /* Compatibility */
  --background: var(--bg-base);
  --card: var(--glass-base);
  --card-foreground: var(--foreground);
  --popover: var(--glass-elevated);
  --popover-foreground: var(--foreground);
  --primary: var(--accent-emerald);
  --primary-foreground: oklch(0.99 0 0);
  --secondary: var(--glass-base);
  --secondary-foreground: var(--foreground);
  --muted: var(--glass-base);
  --accent: var(--glass-elevated);
  --accent-foreground: var(--foreground);
  --destructive: oklch(0.55 0.24 22);
  --border: var(--glass-border);
  --input: var(--glass-elevated);
  --ring: var(--accent-emerald);
  --chart-1: var(--accent-emerald);
  --chart-2: var(--accent-violet);
  --chart-3: var(--accent-cyan);
  --chart-4: var(--accent-pink);
  --chart-5: var(--accent-amber);
  --radius: 1rem;
  --radius-card: 1.25rem;
  --radius-sheet: 2rem;
  --radius-pill: 999px;
  --sidebar: var(--glass-base);
  --sidebar-foreground: var(--foreground);
  --sidebar-primary: var(--accent-emerald);
  --sidebar-primary-foreground: oklch(0.99 0 0);
  --sidebar-accent: var(--glass-elevated);
  --sidebar-accent-foreground: var(--foreground);
  --sidebar-border: var(--glass-border);
  --sidebar-ring: var(--accent-emerald);
}
```

1.2. Adaugă în globals.css o secțiune nouă cu utility classes globale:

```css
@layer utilities {
  /* ========== LIQUID GLASS — primary surface ========== */
  .glass {
    background: var(--glass-base);
    backdrop-filter: blur(40px) saturate(180%) brightness(1.05);
    -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(1.05);
    border: 1px solid var(--glass-border);
    box-shadow:
      inset 0 1px 0 var(--glass-border-hi),
      0 1px 2px var(--glass-shadow),
      0 8px 24px -8px var(--glass-shadow);
  }
  .glass-strong {
    background: var(--glass-strong);
    backdrop-filter: blur(60px) saturate(200%) brightness(1.08);
    -webkit-backdrop-filter: blur(60px) saturate(200%) brightness(1.08);
    border: 1px solid var(--glass-border);
    box-shadow:
      inset 0 1px 0 var(--glass-border-hi),
      0 4px 12px var(--glass-shadow),
      0 16px 48px -16px var(--glass-shadow);
  }
  .glass-thin {
    background: oklch(from var(--glass-base) l c h / 0.4);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    border: 1px solid var(--glass-border);
  }

  /* ========== GLOW HALOS ========== */
  .glow-emerald {
    box-shadow:
      0 0 0 1px oklch(from var(--accent-emerald) l c h / 0.2),
      0 0 24px -4px oklch(from var(--accent-emerald) l c h / 0.5),
      0 0 80px -8px oklch(from var(--accent-emerald) l c h / 0.3);
  }
  .glow-violet {
    box-shadow:
      0 0 0 1px oklch(from var(--accent-violet) l c h / 0.2),
      0 0 24px -4px oklch(from var(--accent-violet) l c h / 0.5),
      0 0 80px -8px oklch(from var(--accent-violet) l c h / 0.3);
  }
  .glow-cyan {
    box-shadow:
      0 0 0 1px oklch(from var(--accent-cyan) l c h / 0.2),
      0 0 24px -4px oklch(from var(--accent-cyan) l c h / 0.5),
      0 0 80px -8px oklch(from var(--accent-cyan) l c h / 0.3);
  }

  /* ========== TEXT GRADIENT ========== */
  .text-gradient-emerald {
    background: linear-gradient(135deg,
      oklch(from var(--accent-emerald) calc(l + 0.05) c h),
      oklch(from var(--accent-cyan) l c h));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .text-gradient-violet {
    background: linear-gradient(135deg,
      oklch(from var(--accent-violet) calc(l + 0.05) c h),
      oklch(from var(--accent-pink) l c h));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .text-gradient-aurora {
    background: linear-gradient(135deg,
      oklch(from var(--accent-cyan) l c h),
      oklch(from var(--accent-violet) l c h),
      oklch(from var(--accent-emerald) l c h));
    background-size: 200% 200%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: gradient-flow 8s ease infinite;
  }

  /* ========== SPECULAR HIGHLIGHT (light follow on hover) ========== */
  .specular {
    position: relative;
    overflow: hidden;
  }
  .specular::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      400px circle at var(--mx, 50%) var(--my, 50%),
      oklch(from var(--accent-emerald) l c h / 0.15),
      transparent 40%
    );
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
  }
  .specular:hover::before {
    opacity: 1;
  }

  /* ========== NUMERIC EMPHASIS ========== */
  .num-hero {
    font-feature-settings: "tnum" 1, "ss01" 1, "zero" 1;
    font-variant-numeric: tabular-nums slashed-zero;
    letter-spacing: -0.02em;
    font-weight: 600;
  }

  /* ========== SHIMMER pentru loading ========== */
  .shimmer {
    background: linear-gradient(
      90deg,
      transparent 0%,
      oklch(from var(--foreground) l c h / 0.05) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  /* ========== NOISE TEXTURE OVERLAY ========== */
  .noise::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.025;
    mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='1'/></svg>");
  }
}

@keyframes gradient-flow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes mesh-drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -20px) scale(1.1); }
  66% { transform: translate(-20px, 30px) scale(0.95); }
}
@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}

/* Reduce motion */
@media (prefers-reduced-motion: reduce) {
  .text-gradient-aurora { animation: none; }
  .shimmer { animation: none; }
}
html.a11y-reduce-motion .text-gradient-aurora,
html.a11y-reduce-motion .shimmer { animation: none; }
```

1.3. Body background — radial mesh ambient. Modifică `@layer base` astfel:

```css
@layer base {
  * { @apply border-border outline-ring/50; }
  html { @apply font-sans; -webkit-tap-highlight-color: transparent; }
  body {
    @apply text-foreground;
    background: var(--bg-base);
    background-image:
      radial-gradient(at 20% 10%,
        oklch(from var(--accent-emerald) l c h / 0.15) 0px, transparent 50%),
      radial-gradient(at 80% 0%,
        oklch(from var(--accent-violet) l c h / 0.12) 0px, transparent 50%),
      radial-gradient(at 70% 80%,
        oklch(from var(--accent-cyan) l c h / 0.10) 0px, transparent 50%),
      radial-gradient(at 0% 90%,
        oklch(from var(--accent-pink) l c h / 0.08) 0px, transparent 50%);
    min-height: 100vh;
    overflow-x: hidden;
  }
  /* Selection */
  ::selection {
    background: oklch(from var(--accent-emerald) l c h / 0.3);
    color: var(--foreground);
  }
  /* Scrollbar — iOS-like thin */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: oklch(from var(--foreground) l c h / 0.15);
    border-radius: 999px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: oklch(from var(--foreground) l c h / 0.25);
  }
}
```

1.4. Verifică: `npm run typecheck` clean. `npm run dev` și deschide localhost:3000 —
     ar trebui să vezi background-ul cu blob-uri colored vizibile.
     Commit: `style(tokens): aurora palette + glass utilities + body mesh`

═══════════════════════════════════════════════════════════════════════════
ETAPA 2 — Componente UI primitive (shadcn refresh)
═══════════════════════════════════════════════════════════════════════════

2.1. `src/components/ui/card.tsx` — schimbă variantele card-ului ca să folosească
     glass. Card-ul implicit devine glass; adaugă variant pentru "solid" pe
     situațiile unde nu vrei translucență. Schimbă `rounded-xl` cu `rounded-[--radius-card]`.

2.2. `src/components/ui/button.tsx` — adaugă variant nou `glow` care primary +
     halo emerald. Default variant primește hover scale-105 + transition cubic-bezier.

2.3. `src/components/ui/sheet.tsx` și `drawer.tsx` — `rounded-t-[--radius-sheet]`,
     glass-strong background, handle vizual (capsule mic în top). Spring open
     animation cu `motion`.

2.4. `src/components/ui/dialog.tsx` — overlay cu blur(8px) + `bg-black/30`,
     conținut glass-strong rounded-card.

2.5. `src/components/ui/skeleton.tsx` — înlocuiește bg-ul plat cu shimmer:
     ```tsx
     <div className="shimmer rounded-[--radius] bg-[oklch(from_var(--foreground)_l_c_h/0.05)]" />
     ```

2.6. `src/components/ui/tabs.tsx` — TabsList primește bg-glass-thin rounded-pill,
     TabsTrigger active primește bg-foreground/10 + glow subtle.

2.7. `src/components/ui/switch.tsx` — refă-l iOS-style:
     - track: rounded-pill, w-12 h-7
     - thumb: rounded-full size-6 cu shadow-md
     - checked: bg-emerald gradient
     - off: bg-foreground/20
     - spring transition

2.8. `src/components/ui/sonner.tsx` (toaster) — schimbă theme: position
     'top-center', styling glass-strong + rounded-card, max-width 420px,
     duration 4000ms, expand on hover.

2.9. `src/components/ui/input.tsx` și `textarea.tsx` — bg-glass-thin, border-border,
     focus-ring colored, padding generos (h-11 nu h-9), text-base.

2.10. `src/components/ui/badge.tsx` — variants: emerald, violet, cyan, amber,
     destructive — toate glass-thin cu border colored și text colored.

2.11. Verifică typecheck/lint clean.
      Commit: `style(ui): glass primitives + iOS switch + shimmer skeleton`

═══════════════════════════════════════════════════════════════════════════
ETAPA 3 — Componenta nouă: AuroraBackground (mesh animat)
═══════════════════════════════════════════════════════════════════════════

3.1. Creează `src/components/effects/aurora-background.tsx`:

```tsx
"use client";

export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* 4 blob-uri care plutesc subtil */}
      <div
        className="absolute -top-40 -left-32 size-[500px] rounded-full opacity-40 blur-[120px]"
        style={{
          background: "oklch(from var(--accent-emerald) l c h / 0.6)",
          animation: "mesh-drift 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -top-20 right-0 size-[450px] rounded-full opacity-35 blur-[120px]"
        style={{
          background: "oklch(from var(--accent-violet) l c h / 0.55)",
          animation: "mesh-drift 25s ease-in-out infinite reverse",
          animationDelay: "-5s",
        }}
      />
      <div
        className="absolute bottom-0 right-1/4 size-[400px] rounded-full opacity-30 blur-[120px]"
        style={{
          background: "oklch(from var(--accent-cyan) l c h / 0.5)",
          animation: "mesh-drift 30s ease-in-out infinite",
          animationDelay: "-10s",
        }}
      />
      <div
        className="absolute -bottom-20 -left-20 size-[380px] rounded-full opacity-25 blur-[120px]"
        style={{
          background: "oklch(from var(--accent-pink) l c h / 0.45)",
          animation: "mesh-drift 35s ease-in-out infinite reverse",
          animationDelay: "-15s",
        }}
      />
    </div>
  );
}
```

3.2. În `src/app/(dashboard)/layout.tsx` și `src/app/(auth)/layout.tsx`,
     adaugă `<AuroraBackground />` ca PRIMUL copil în returnul layout-ului
     (înainte de orice div).

3.3. Modifică body-ul în root layout să elimine background gradient (acum vine
     din AuroraBackground, nu din body) DACĂ vrei mai mult control. Altfel
     păstrează ambele.

3.4. Commit: `feat(effects): aurora-background mesh ambient cu drift`

═══════════════════════════════════════════════════════════════════════════
ETAPA 4 — Refacerea Bottom Tab Bar și Sidebar (nav.tsx)
═══════════════════════════════════════════════════════════════════════════

4.1. Bottom tab bar — schimbă wrapper-ul:
```tsx
<nav
  aria-label="Navigare principală"
  className="glass-strong fixed inset-x-2 bottom-2 z-40 mx-auto max-w-md rounded-[--radius-sheet] border md:hidden"
  style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
>
```
- Floating cu margin lateral (NU full-width). Inset-x-2 bottom-2.
- Rounded radius mare (radius-sheet = 32px).
- Glass-strong cu border subtil.

4.2. Tab-urile active primesc o pill colored cu glow:
```tsx
<Link
  className={cn(
    "relative flex h-14 flex-col items-center justify-center gap-0.5 px-3 text-[10px] font-medium transition",
    active ? "text-foreground" : "text-muted-foreground"
  )}
>
  {active && (
    <span
      aria-hidden
      className="absolute inset-0 -z-10 rounded-2xl"
      style={{
        background: "oklch(from var(--accent-emerald) l c h / 0.15)",
        boxShadow:
          "0 0 0 1px oklch(from var(--accent-emerald) l c h / 0.25), inset 0 1px 0 oklch(1 0 0 / 0.1)",
      }}
    />
  )}
  <item.Icon className={cn("size-5 transition", active && "text-[--accent-emerald]")} />
  <span>{item.label}</span>
</Link>
```

4.3. FAB-ul (`QuickAddFab`) — full glass + glow + gradient:
```tsx
<button
  className={cn(
    "relative flex size-14 items-center justify-center rounded-full transition active:scale-90",
    "bg-gradient-to-br from-[--accent-emerald] to-[--accent-cyan]",
    "shadow-[0_0_0_4px_oklch(from_var(--bg-base)_l_c_h_/_0.5),0_0_24px_oklch(from_var(--accent-emerald)_l_c_h_/_0.5),0_0_60px_-8px_oklch(from_var(--accent-emerald)_l_c_h_/_0.4)]",
    "text-[--bg-base]"
  )}
>
  <Plus className="size-6" strokeWidth={2.5} />
</button>
```
- Plus pulse animation pe inactivity (opțional, după 5s fără tap):
  `animation: glow-pulse 2.5s ease-in-out infinite`.

4.4. Sidebar (desktop) — wrapper devine glass:
```tsx
<aside className="glass hidden w-64 shrink-0 m-3 mr-0 rounded-[--radius-card] md:flex md:flex-col">
```
- Margin 3, rounded card mare. Logo-ul în top primește gradient text aurora.
- SidebarLink active primește bg-glass-elevated + glow-emerald subtil.

4.5. Verifică pe mobil (DevTools responsive). Commit:
     `style(nav): floating glass tab bar + glow FAB + sidebar refresh`

═══════════════════════════════════════════════════════════════════════════
ETAPA 5 — Dashboard widgets (hero number cu glow)
═══════════════════════════════════════════════════════════════════════════

5.1. `NetWorthHeadline` — devine card glass cu glow ambient pe partea cu suma.
     Suma în text gradient aurora dacă pozitivă, monochrome dacă neutru.
     Sparkline-ul cu gradient fill emerald → transparent.

5.2. `KpiCard` — glass-thin + hover:specular. Suma `num-hero`. Delta cu badge
     mic colored. Icon într-un circle glass-elevated cu colored tint.

5.3. `BudgetPulseBar` — bar-ul stacked devine 3 stop-uri cu gradient (emerald →
     amber → red când e foarte aproape de cap). Track-ul glass-thin rounded-pill.
     Sub-textul "mai ai X lei pentru Y zile" — bold cu accent.

5.4. `GreetingCard` — glass-thin cu noise overlay. Hour-aware emoji (☀️ dim, 🌤️ ziua,
     🌙 seara). Avatar mic glass cu border emerald.

5.5. Charts (Sankey, NetWorthChart, IncomeVsExpense, CategoryTreemap):
     - Background card: glass
     - Linii/bars: gradient stops emerald-cyan-violet
     - Tooltip: glass-strong rounded mic
     - Grid: stroke `oklch(from var(--foreground) l c h / 0.08)` (foarte subtil)

5.6. Calendar heatmap — color scale folosește emerald cu opacity 0.1 → 1, plus
     hover glow.

5.7. Goals progress rings — gradient stroke aurora (emerald start, cyan middle,
     violet end). Cu glow drop-shadow filtru pe SVG.

5.8. Verifică typecheck/lint. Commit:
     `style(dashboard): glass widgets + gradient charts + glow rings`

═══════════════════════════════════════════════════════════════════════════
ETAPA 6 — Quick-add sheet și keypad (signature feature)
═══════════════════════════════════════════════════════════════════════════

6.1. Sheet-ul de quick-add devine glass-strong cu rounded-sheet (32px).
     Handle bar mic în top (capsule 40x4 px gri).

6.2. Numeric keypad:
     - Butoane glass-thin rounded-2xl, cu hover subtle bg-foreground/8
     - Active state cu glow emerald 200ms
     - Operatorii (+−×÷) accent-violet text + bg-glass cu accent border
     - Display-ul de sumă: text gigant 60px num-hero + text-gradient-aurora
       când sum > 0, monochrome 0
     - Haptic vibrate(8) la fiecare tap
     - Spring scale 0.92 → 1 pe press (motion)

6.3. Preset bar — chips glass-thin cu emoji colored, selected = glow-emerald.

6.4. Voice button în quick-add — circle 56px glass cu mic icon. Pe activ:
     pulsing glow-violet + waveform mini animation (4 bars care joacă).

6.5. Receipt button — similar dar glow-cyan și icon Camera.

6.6. Account picker pill — glass-thin cu chevron, deschide bottom sheet cu
     listă conturi (glass cards 1-per-row).

6.7. Category grid — chip-uri 4-coloane mobile, 6-desktop. Selected = glow
     emerald + scale 1.05 spring.

6.8. Save button (full-width în footer): gradient emerald-to-cyan, glow puternic,
     text "Salvează" + arrow icon, h-14 rounded-xl.

6.9. Commit: `style(quick-add): glass sheet + glow keypad + iOS-style chips`

═══════════════════════════════════════════════════════════════════════════
ETAPA 7 — Transactions, Budgets, Goals, Accounts, Settings (toate ecranele)
═══════════════════════════════════════════════════════════════════════════

7.1. Transactions list:
     - Day headers sticky: glass-thin pill micul în top-left al group-ului,
       cu data + total pe zi colored
     - Row: glass-thin rounded-xl cu hover:specular. Logo circle 40px glass-
       elevated. Amount tabular num cu cents la 80%. Pending = pulse subtle.
     - Swipe gestures: spring physics motion. Action buttons reveal cu glow
       (verde pentru categorize, ambre pentru hide, rosu pentru delete).
     - Filters: chips glass-thin rounded-pill. Active = glow emerald.
     - Bulk action bar: glass-strong floating bottom 80px from bottom, cu
       glow violet la primul render.
     - Transaction detail drawer: glass-strong rounded-sheet. Hero amount
       gigant gradient-text. Category badge glass-thin colored.

7.2. Budgets:
     - Summary card: glass-strong cu glow emerald subtil.
     - Stacked progress bar: gradient 3 stops (emerald → amber → destructive).
     - Per-category row: glass-thin cu progress bar colored. Click → drawer
       cu chart bar 6 luni gradient.
     - Envelope mode "Ready to Assign" banner: glass-strong cu glow emerald
       când pozitiv, glow-amber când 0, glow-destructive când negativ.

7.3. Goals:
     - Card: glass cu emoji XL + progress ring gradient aurora. Hover = scale
       1.02 spring.
     - ETA badge: glass-thin colored.
     - Debt payoff side-by-side: 2 card-uri glass cu gradient header diferit
       (snowball = cyan, avalanche = violet). Recommendation badge cu glow.
     - Goal celebration: confetti canvas + toast glass-strong cu glow aurora.

7.4. Accounts:
     - Card: glass-elevated cu icon emoji XL în top-left, balance num-hero
       gradient, IBAN last4 monochrome bottom.
     - Hover: lift up 4px + glow colored după type (checking=emerald,
       savings=cyan, credit=violet, loan=amber, meal_voucher=pink).
     - Empty state: illustration central + CTA glow.

7.5. Settings — fiecare panel glass card. Tabs primesc glow underline pe activ.
     Notif preferences switches iOS-style cu colored gradient.

7.6. Login page: full-screen aurora background. Card central glass-strong
     rounded-card cu glow emerald subtil. Logo gradient text. Input glass-thin
     focus ring colored. Buton "Trimite link" gradient-glow.

7.7. Verifică pe mobile (DevTools 375px). Commit-uri logice (3-4):
     `style(transactions): glass rows + spring swipe + colored amount`
     `style(budgets-goals): glass + progress gradients + ring aurora`
     `style(accounts-settings-auth): glass overhaul`

═══════════════════════════════════════════════════════════════════════════
ETAPA 8 — Animații + interacțiuni (motion)
═══════════════════════════════════════════════════════════════════════════

8.1. Page transitions: fade-in + slide-up 8px pe fiecare page change. Folosește
     `motion` (deja instalat).

8.2. Card-urile de pe dashboard: stagger entrance (0.05s între ele).

8.3. Toast-uri: spring slide-down + scale 0.95→1.

8.4. Modals/Sheets: spring (stiffness 200, damping 25).

8.5. Hover states pe card-uri clickable: scale 1.01 + lift 2px (transform).

8.6. Tap states pe button-uri: scale 0.96 spring back.

8.7. Number transitions: count-up animation cu spring (motion `<MotionValue>` +
     `useTransform`). Aplicat pe toate sumele importante (net worth, KPI,
     goals, budgets totals).

8.8. Skeletons devin shimmer real (aplicat în Etapa 2).

8.9. Pull-to-refresh (mobile): hook custom în transactions list. La trag jos
     >80px → trigger refresh + spring rebound + glow indicator emerald.

8.10. Reduce motion: respect `prefers-reduced-motion` și `html.a11y-reduce-motion`
      → toate animațiile devin instant.

8.11. Commit: `feat(motion): page transitions + spring physics + count-up`

═══════════════════════════════════════════════════════════════════════════
ETAPA 9 — Iconografie + tipografie + detalii fine
═══════════════════════════════════════════════════════════════════════════

9.1. Icoanele lucide — toate cu `strokeWidth={1.75}` (default e 2, prea gros
     pentru iOS). Aplicat global prin context provider sau prop default pe
     fiecare. Mai elegant: în `lib/utils.ts` exportă constanta ICON_STROKE = 1.75.

9.2. Font:
     - Heading: variabilă "SF Pro Display" fallback "Geist" (deja folosit)
       sau add Inter Display
     - Mono pentru sume mari: "Geist Mono" cu features `tnum slashed-zero`
     - Verifică `globals.css` font-feature-settings global

9.3. Spațiere generală — verifică că folosești `gap-3` (12px) și `gap-4` (16px)
     consistent. Marginile între secțiuni dashboard: `space-y-4` (era ok deja).

9.4. Border-radius consistency:
     - Card-uri mari: rounded-card (20px)
     - Card-uri mici/buttons: rounded-xl (12px) sau rounded-2xl (16px)
     - Sheets/drawers: rounded-sheet (32px) doar top
     - Pills: rounded-pill (999)
     - Inputs: rounded-xl
     - Avatars/icons: rounded-full

9.5. Empty states friendly. Pentru fiecare ecran care poate fi gol, creează un
     component dedicat:
     - Mare: emoji XL + titlu + sub-text muted + CTA glow
     - Mic: pictogramă + 1 linie text

9.6. Loading microinteractions — nu doar Skeleton. Pe save, butonul devine
     loading spinner mic în loc de text, păstrează dimensiunea.

9.7. Empty input pe sumă cu placeholder gradient subtle.

9.8. Commit: `polish(typography-icons-empty): consistency + microinteractions`

═══════════════════════════════════════════════════════════════════════════
ETAPA 10 — Verificare finală
═══════════════════════════════════════════════════════════════════════════

10.1. `npm run typecheck` → 0 erori.
10.2. `npm run lint` → 0 erori, max 4 warnings react-compiler.
10.3. `npm run dev` și deschide localhost:3000 — testează:
      - Dashboard cu Aurora background vizibil
      - Toate widget-urile cu glass
      - Quick-add sheet glow keypad
      - Transactions cu swipe glass
      - Budgets/Goals colored
      - Settings clean
      - Theme toggle (light/dark) tranziție smooth
10.4. DevTools mobile 375px — bottom tab bar floating, no overflow.
10.5. Zoom in 200% — text rămâne lizibil, layout-ul nu sparge.
10.6. Inspect cu Chrome a11y — checks WCAG AA contrast.
10.7. Performance: lighthouse local pe build (după Vercel deploy). PWA 100,
      a11y >95, perf mobile >85.
10.8. Update CLAUDE.md secțiunea relevantă: "Faza 13 — Liquid Glass design system".
10.9. Commit final: `chore: design system Liquid Glass complet (Faza 13)`

10.10. Raportează rezumat: ce ai implementat, eventuale decizii (gen "am
       eliminat noise overlay pe mobil pentru perf"), screenshot-uri sugerate
       să fie făcute manual.

═══════════════════════════════════════════════════════════════════════════
PRIORITĂȚI dacă context-ul devine limitat
═══════════════════════════════════════════════════════════════════════════

Dacă vezi că pierzi context, oprește-te DUPĂ etapele în această ordine de prioritate:
1. Etapa 1 (tokens) — face cele mai multe lucruri să arate decent automat.
2. Etapa 3 (aurora) — wow factor instant.
3. Etapa 5 (dashboard widgets) — pagina principală arată bine.
4. Etapa 4 (nav floating) — "feel"-ul iOS.
5. Etapa 6 (quick-add) — flow-ul cel mai folosit.
6. Etapa 2 (UI primitives) — propagă peste tot.
7. Etapa 7 (restul ecranelor) — incremental.
8. Etapa 8 (motion) — polish.
9. Etapa 9 (typo + icons) — final touches.

Dacă termin oricare etapă cu erori, le repar înainte de a trece la următoarea.
NU sar peste verificări.

START.
```
