import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isDev = process.env.NODE_ENV !== "production";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: isDev,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Acknowledge Turbopack as the intended dev/build bundler. Serwist's wrapper
  // still attaches a (no-op in dev) `webpack` function to next config and
  // Next.js warns when both keys exist without an explicit Turbopack opt-in.
  turbopack: {},
  typescript: {
    // Validatorul de build din Next 16 (workerul `next/dist/build/typescript`)
    // crash-uia cu ACCESS_VIOLATION pe Windows pe instantieri adânci de generic-uri
    // (Zod 4 + RHF + tipurile Database). Validarea reală rulează prin
    // `npm run typecheck` (tsc --noEmit strict) — sursa de adevăr pentru CI.
    ignoreBuildErrors: true,
  },
  // Limităm numărul de worker-i pentru `collecting page data` și
  // `static page generation` — pe Windows, 11 workers concurenți
  // ajung la limita de virtual memory și pică cu VirtualAlloc failed.
  experimental: {
    cpus: 2,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
