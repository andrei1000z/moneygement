"use client";

/**
 * AuroraBackground — 4 blob-uri soft-glow care plutesc lent pe ecran
 * cu animația `mesh-drift` (definită în globals.css). Fixed full-screen
 * negative z-index, pointer-events none.
 *
 * Vrem un wow factor calm, nu disco — opacități 0.25-0.40, blur 120px,
 * cicluri 20-35s diferite ca să nu sincronizeze.
 *
 * `prefers-reduced-motion` și `html.a11y-reduce-motion` opresc animația
 * automat (vezi globals.css §reduce-motion).
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute -left-32 -top-40 size-[500px] rounded-full opacity-40 blur-[120px]"
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
