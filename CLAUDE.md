@AGENTS.md

# Banii — instrucțiuni pentru Claude Code

## 1. Despre proiect

**Banii** este un PWA de finanțe personale Romania-first, construit pentru o singură gospodărie cu doi useri (Andrei, 14 ani, dezvoltator + mama lui). Fără monetizare, fără tier-uri, fără pagini de marketing. Specificația completă (motivația, feature matrix, schema DB, decizii UX) trăiește în [BLUEPRINT.md](./BLUEPRINT.md) — citește-l înainte de orice fază nouă.

Linii directoare ale produsului:

- **Romania-first**: locale `ro-RO`, BNR ca sursă canonică pentru FX, diacritice complete, categorii și merchanți românești pre-seed.
- **Two-users-one-household**: gospodăria este unitatea de bază; transferurile între conturi sunt entități first-class, necategorisite și excluse din analize de spending.
- **Calm collaboration**: nicio gamificare cu presiune, recap-uri saptămânale cu ton de prieten, fără leaderboards.
- **Hero number pe fiecare ecran**: dashboard-ul răspunde "ce se întâmplă cu banii noștri?" în &lt;5 secunde.

## 2. Stack lock (versiuni la final de Faza 0)

Schimbări de versiuni majore se fac doar cu motivație explicită.

- **Next.js** `16.2.4` (App Router, React Server Components, Turbopack default)
- **React** / **react-dom** `19.2.4`
- **TypeScript** `^5` (strict mode)
- **Tailwind CSS** `^4` cu `@tailwindcss/postcss` (CSS-first `@theme`)
- **shadcn/ui** preset `radix-nova` (echivalentul New York), `slate` base, CSS variables, dark mode default. Iconițe: `lucide-react`.
- **Supabase**: `@supabase/ssr ^0.10.2`, `@supabase/supabase-js ^2.104.1`(Postgres 16 + Auth + Storage + Edge Functions + pg_cron + pgvector).
- **State / data**: `@tanstack/react-query ^5.100`, `zustand ^5.0`, `react-hook-form ^7.74` + `zod ^4.3` + `@hookform/resolvers ^5.2`.
- **PWA**: `@serwist/next ^9.5.7` + `serwist ^9.5.7` (NU `next-pwa`).
- **Money & FX**: `dinero.js@2.0.0-alpha.14` + `fast-xml-parser ^5.7`.
- **AI**: `ai ^6.0` (Vercel AI SDK 6) + `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/groq`.
- **UX utilities**: `sonner`, `date-fns`, `class-variance-authority`, `clsx`, `tailwind-merge`, `cmdk` (via shadcn).

Vezi `package.json` pentru lista completă.

## 3. Convenții de cod (obligatorii)

- **Bani**: stocăm `BIGINT` în unități minore (bani pentru RON, cents pentru EUR). NU folosim float / Number cu zecimale, NU `numeric` / `decimal` în frontend. Operațiile pleacă din `dinero.js` v2 prin helper-ele din [src/lib/money.ts](./src/lib/money.ts).
- **FX**: rate zilnice de la BNR, fallback Frankfurter; `base_amount` se calculează prin trigger SQL la `INSERT/UPDATE`, nu re-calculate ulterior.
- **Format**: `Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' })` cu post-procesare pentru sufixul `lei`. Date `DD.MM.YYYY`, prima zi a săptămânii luni.
- **Server-only**: orice import de `service_role`, chei AI, sau `next/headers` trăiește într-un fișier care începe cu `import "server-only";`. Niciun secret în bundle-ul client.
- **RLS** activat pe **toate** tabelele din schema `public`. Helper-ul `app.user_household_ids()` (security-definer) este sursa de adevăr pentru membership.
- **Path aliases**: imports prin `@/*` (vezi `tsconfig.json`).
- **shadcn/ui**: componentele de bază trăiesc în [src/components/ui/](./src/components/ui/); feature components în [src/components/features/](./src/components/features/).
- **Dark mode** este implicit (clasa `dark` pe `<html>`); light mode rămâne opțional și folosește `#FAFAF7` ca background warm-white.

## 4. Reguli ferme — NU

- ❌ NU folosi `Number` / floats pentru bani. Niciodată.
- ❌ NU stoca chei sau IBAN-uri în plaintext în Postgres — IBAN se criptează cu `pgcrypto`, cheia trăiește în Supabase Vault.
- ❌ NU expune `SUPABASE_SERVICE_ROLE_KEY` clientului. Verifică prefixul `NEXT_PUBLIC_` înainte de orice import.
- ❌ NU bypass-a RLS cu service role în route handlers care servesc useri autentificați. Service role doar pentru cron jobs și migrări.
- ❌ NU adăuga pagini de marketing, banner-e de cookies, prompt-uri de consimțământ analytics. Excepție GDPR Art. 2(2)(c) (household).
- ❌ NU folosi `next-pwa`. Migrarea la Serwist este o decizie luată.
- ❌ NU folosi `--webpack` în development. Dev rulează cu Turbopack (Serwist e dezactivat în dev). Build-ul de producție folosește `next build --webpack` pentru ca Serwist să injecteze SW manifest-ul.

## 5. Faze (din [BLUEPRINT.md](http://BLUEPRINT.md) §11)

- **Faza 0** — setup (Next.js, Tailwind, shadcn, Supabase clients, Serwist, proxy/middleware, env). **Status: complet.**

  > Notă Next.js 16: convenția `middleware.ts` a fost redenumită `proxy.ts` — fișierul rădăcină este [src/proxy.ts](./src/proxy.ts), exportă funcția `proxy(request)`. Helper-ul Supabase [src/lib/supabase/middleware.ts](./src/lib/supabase/middleware.ts)rămâne cu numele istoric (e doar un modul intern).

- **Faza 1** — schema Supabase + RLS + magic-link auth + household auto-creation. **Status: complet.** (Lipsește invite mamă — în Faza 2.)

  > Migrațiile trăiesc în [src/db/migrations/](./src/db/migrations/)(vezi `README.md` din folder pentru pașii de aplicare cu Supabase CLI). Toate cele 5 fișiere parsează clean cu libpg_query.

- **Faza 2** — conturi / categorii / merchanți (CRUD), wrapper money (Dinero v2), IBAN encryption (pgcrypto + Vault, vezi 0005_iban_crypto.sql), TanStack Query provider, count-up animation cu `motion`, dashboard nav extins. **Status: complet.** (Lipsește invite mamă, CSV importer, pipeline FX — împinse în Faza 3.)

  > Notă build: `next build --webpack` rulează cu `typescript.ignoreBuildErrors: true` pentru că validatorul de tip al Next 16 crash-uia cu ACCESS_VIOLATION pe Windows pe instantieri adânci (Zod 4 + RHF + tipurile Database). `npm run typecheck` (tsc strict) rămâne sursa de adevăr.

- **Faza 3** — tranzacții (CRUD, listă virtualizată, filtre cu URL state, bulk actions, splits, transfer auto-detect via 0010 trigger, detail drawer cu comentarii, swipe gestures cu motion). **Status: complet.**(Lipsește invite mamă, CSV importer, pipeline FX — împinse în Faza 4.)

- **Faza 4** — quick-add sheet (custom keypad cu calculator, presets pinned, voice via Web Speech + Groq, receipt OCR via GPT-4o vision), draft persistence în localStorage. **Status: complet.** (Lipsește invite mamă, CSV importer, pipeline FX — împinse în Faza 5.)

- **Faza 5** — bugete (target-based + envelope mode YNAB-style cu Ready to Assign + Move Money + Auto-assign + rollover via 0012 RPC), goals (5 bucket types, progress ring SVG, ETA, debt snowball/avalanche cu recomandare). **Status: complet.** (Lipsește invite mamă, CSV importer, pipeline FX — împinse în Faza 6.)

- **Faza 6** — invite mamă, CSV importer (6 bănci), pipeline FX
  (BNR + Frankfurter cu cron). **Status: complet.**

  > FX: migrare 0006 + Edge Function `fx-update` + `/api/fx/historical`
  > pentru backfill, pagina `/insights/fx` cu chart 12 luni.
  > Invite: migrare 0007 + RPC `accept_invite` + UI în `/settings`.
  > CSV: 6 parsere (BT24/BCR/ING/Revolut/CEC/Raiffeisen) +
  > merchant-matcher 4-tier + UI wizard în `/import`.

- **Faza 7** — dashboard streaming (RSC + Suspense), hero number, KPI
  cards, mini-Sankey, calendar heatmap, recent transactions.
  **Status: complet** (livrat în Faza 5/6 vizuale).

- **Faza 8** — AI 3-tier categorize (rules → KNN → LLM), chat cu
  tool-calling (Vercel AI SDK 6), weekly recap, anomaly detection,
  subscription detector. **Status: complet.**

  > Migrare 0008 (embedding_queue + chat_threads + chat_messages +
  > recaps + detected_subscriptions) + 0009 (cron-uri).
  > Edge functions: `process-embeddings`, `weekly-recap`.
  > Pagini: `/ai`, `/subscriptions`. Tool-uri: query_transactions,
  > get_budget, get_net_worth, get_goal_progress, simulate_scenario,
  > semantic_search, update_transaction_category.

- **Faza 9** — PWA push + offline queue + Enable Banking integration.
  **Status: complet.**

  > web-push + idb. SW extins cu push event handler. Component
  > `PushPrompt` (după 5 acțiuni, gating iOS la PWA install) +
  > `OfflineDrainer` (drain pe `online`).
  > Enable Banking: client JWT RS256 cu jose, routes `start-auth` /
  > `callback`, pagina `/connections`, Edge Function `bank-sync`,
  > cron 6h (migrare 0020).

- **Faza 10** — features românești.
  **Status: parțial complet.**

  > Livrat: `lib/text/diacritics`, `lib/holidays/ro` (Computus),
  > `lib/forecast/cashflow` (30/60/90 zile cu confidence band ±15%),
  > `lib/intelligence/{rage-spending,lifestyle-inflation,anniversaries}`,
  > `lib/meal-vouchers/providers`, `lib/seasonal/budgets`.
  > Rămase pentru V2: pagini dedicate Pilon III tracker, salary
  > intelligence (income_streams + algoritm detection), tichete masă
  > UI cu lots & expiry warnings, seasonal budgets auto-prompt UI.

- **Faza 12** — PWA polish (icons, install prompt, connection status,
  push, offline queue). **Status: complet** (Faza 12 anterioară din
  BLUEPRINT a fost realizată în Stage B + G).

- **Faza 13** — Liquid Glass design system (iOS premium). **Status: complet.**

  > Tokens Aurora în `globals.css`: paletă oklch (emerald/violet/cyan/
  > pink/amber) + variabile glass (base/elevated/strong/border/border-hi/
  > shadow) + radius scale (--radius / --radius-card / --radius-sheet /
  > --radius-pill).
  > Utilities: `.glass`, `.glass-strong`, `.glass-thin` (backdrop-blur
  > 24-60px + saturate + brightness + inset highlight), 5x `.glow-*`,
  > 3x `.text-gradient-*` (cu animație `gradient-flow` pentru aurora),
  > `.specular` (radial follow on hover), `.num-hero` (tabular slashed-zero
  > letter-spacing tight), `.shimmer`, `.noise`.
  > Body cu radial-gradient mesh ambient 4 colțuri.
  > `AuroraBackground`: 4 blob-uri soft-glow drift 20-35s în (dashboard) +
  > (auth) layouts.
  > UI primitives glass: `Card` cu variant glass/solid, `Button` cu variant
  > nou `glow` (gradient + glow-emerald), `Switch` iOS-style cu gradient
  > checked + spring, `Skeleton` shimmer, `Tabs` glass-thin pill, `Sheet`
  > / `Drawer` glass-strong cu rounded-sheet 32px și handle bar capsule,
  > `Dialog` overlay backdrop-blur, `Sonner` top-center glass-strong,
  > `Input` / `Textarea` glass-thin h-11, `Badge` 6 variante colored.
  > Floating bottom tab bar (inset-x-2, max-w-md, glass-strong) cu pill
  > emerald active + glow FAB cu gradient + 3-stops shadow (ring/close/
  > ambient). Sidebar glass m-3 mr-0 cu logo `text-gradient-aurora` +
  > SidebarLink active cu bg emerald/12 + ring.
  > Dashboard widgets: NetWorthHeadline glass + text-gradient-emerald,
  > KpiCard glass-thin + specular + accent icons, BudgetPulseBar progress
  > 3-stop gradient (emerald→amber→destructive) cu glow box-shadow,
  > GreetingCard glass-thin + noise + hour-aware emoji, GoalsProgress ring
  > SVG cu gradient aurora + drop-shadow filter glow, RecentTransactions
  > / UpcomingBills cu category colored ring chips.
  > Quick-add: keypad cu display gradient aurora pe sumă > 0, KeyOp violet
  > pe operatori, KeyConfirm gradient emerald→cyan + glow shadow, preset
  > chips glass-thin scale 0.92 active, category grid scale 1.05 + glow
  > pe selected.
  > Restul ecranelor: batch sed pentru toate `border-border/60 bg-card
  > rounded-xl border` → `glass-thin rounded-[--radius-card]`; encoding
  > UTF-8 preservat (sed mingw, NU PowerShell). Login glass-strong cu
  > glow-emerald + title gradient aurora + Mail icon glow halo + buton
  > glow size lg.
  > Motion: `PageTransition` cu fade-in + slide-up 8px iOS easing,
  > `useReducedMotionPref` care combină media query + class toggle din
  > settings (MutationObserver). `ICON_STROKE = 1.75` standard pentru
  > lucide.

## 6. Comanda standard de lucru

Pentru fiecare fază nouă:

1. Citește `BLUEPRINT.md` (secțiunile relevante) **și** descrierea fazei din §5.
2. Confirmă stack-ul versiunilor curente cu `package.json`.
3. Propune un **plan scurt** (componente, fișiere, migrări) și așteaptă confirmarea utilizatorului înainte să modifici cod.
4. Implementează pe pași mici — un commit logic per pas.
5. La final: rulează `npm run typecheck` și `npm run lint`, apoi confirmă vizual cu `npm run dev` (Turbopack).

> Pentru orice update peste Next.js / React / Supabase / shadcn: citește mai întâi nota din [AGENTS.md](./AGENTS.md) și apoi ghidul corespunzător din `node_modules/next/dist/docs/`.
