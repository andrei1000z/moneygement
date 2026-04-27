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
        className="absolute -left-32 -top-40 size-[460px] rounded-full opacity-50 blur-[80px] will-change-transform md:size-[600px]"
        style={{
          background: "color-mix(in oklch, var(--accent-blue), transparent 35%)",
          animation: "mesh-drift 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -top-20 right-0 size-[400px] rounded-full opacity-45 blur-[80px] will-change-transform md:size-[520px]"
        style={{
          background: "color-mix(in oklch, var(--accent-blue-bright), transparent 40%)",
          animation: "mesh-drift 25s ease-in-out infinite reverse",
          animationDelay: "-5s",
        }}
      />
      <div
        className="absolute bottom-0 right-1/4 size-[340px] rounded-full opacity-35 blur-[80px] will-change-transform md:size-[440px]"
        style={{
          background: "color-mix(in oklch, var(--accent-yellow), transparent 55%)",
          animation: "mesh-drift 30s ease-in-out infinite",
          animationDelay: "-10s",
        }}
      />
      <div
        className="absolute -bottom-20 -left-20 size-[340px] rounded-full opacity-30 blur-[80px] will-change-transform md:size-[440px]"
        style={{
          background: "color-mix(in oklch, var(--accent-blue), transparent 50%)",
          animation: "mesh-drift 35s ease-in-out infinite reverse",
          animationDelay: "-15s",
        }}
      />
    </div>
  );
}
