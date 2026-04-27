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
        className="absolute -left-40 -top-40 size-[280px] rounded-full opacity-[0.08] blur-[100px] will-change-transform md:size-[360px]"
        style={{
          background: "var(--accent-blue)",
        }}
      />
      <div
        className="absolute -bottom-40 -right-40 size-[260px] rounded-full opacity-[0.07] blur-[100px] will-change-transform md:size-[340px]"
        style={{
          background: "var(--accent-yellow)",
        }}
      />
    </div>
  );
}
