"use client";

/**
 * AuroraBackground — 4 blob-uri soft-glow care plutesc lent.
 *
 * Optimizări perf:
 * - blur scăzut de la 120px la 60px (compositor mult mai rapid pe Windows
 *   Chrome cu multe glass surfaces deasupra)
 * - `will-change: transform` ca să forțăm GPU layer dedicat
 * - animații dezactivate prin `prefers-reduced-motion` (gestionat în CSS)
 *
 * Pe mobile (<768px) blob-urile sunt mai mici și fără animație → calm cu
 * mult mai puțin compositing cost.
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute -left-32 -top-40 size-[420px] rounded-full opacity-40 blur-[60px] will-change-transform md:size-[500px]"
        style={{
          background: "color-mix(in oklch, var(--accent-emerald), transparent 40%)",
          animation: "mesh-drift 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -top-20 right-0 size-[380px] rounded-full opacity-35 blur-[60px] will-change-transform md:size-[450px]"
        style={{
          background: "color-mix(in oklch, var(--accent-violet), transparent 45%)",
          animation: "mesh-drift 25s ease-in-out infinite reverse",
          animationDelay: "-5s",
        }}
      />
      <div
        className="absolute bottom-0 right-1/4 size-[340px] rounded-full opacity-30 blur-[60px] will-change-transform md:size-[400px]"
        style={{
          background: "color-mix(in oklch, var(--accent-cyan), transparent 50%)",
          animation: "mesh-drift 30s ease-in-out infinite",
          animationDelay: "-10s",
        }}
      />
      <div
        className="absolute -bottom-20 -left-20 size-[320px] rounded-full opacity-25 blur-[60px] will-change-transform md:size-[380px]"
        style={{
          background: "color-mix(in oklch, var(--accent-pink), transparent 55%)",
          animation: "mesh-drift 35s ease-in-out infinite reverse",
          animationDelay: "-15s",
        }}
      />
    </div>
  );
}
