# Banii — Finanțe Personale

PWA de finanțe personale Romania-first pentru o gospodărie de doi useri
(Andrei + mama lui). Construit cu Next.js 16, React 19, Tailwind v4,
shadcn/ui, Supabase, Serwist și Vercel AI SDK.

> Specificația completă: [BLUEPRINT.md](./BLUEPRINT.md). Reguli pentru
> Claude Code: [CLAUDE.md](./CLAUDE.md).

## Cerințe

- Node.js **≥ 20.18** (recomandat 22 LTS)
- npm 10+
- Cont Supabase (free tier e suficient pentru dezvoltare)

## Instalare locală

```bash
# 1. Clonează repo-ul și intră în el
git clone <repo-url> banii
cd banii

# 2. Instalează dependențele
npm install

# 3. Copiază variabilele de mediu și completează valorile reale
cp .env.example .env.local
# Editează .env.local — la minim NEXT_PUBLIC_SUPABASE_URL și
# NEXT_PUBLIC_SUPABASE_ANON_KEY pentru ca aplicația să pornească complet.

# 4. Pornește dev server (Turbopack)
npm run dev
# Aplicația rulează la http://localhost:3000
```

## Scripturi utile

| Comandă             | Descriere                                                  |
| ------------------- | ---------------------------------------------------------- |
| `npm run dev`       | Dev server cu Turbopack (Serwist dezactivat în dev).       |
| `npm run build`     | Build de producție cu Webpack (Serwist injectează SW-ul).  |
| `npm run start`     | Pornește serverul de producție după `build`.               |
| `npm run lint`      | ESLint (config Next.js).                                   |
| `npm run typecheck` | `tsc --noEmit` cu strict mode + `noUncheckedIndexedAccess`. |
| `npm run db:types`  | Regenerează tipurile Supabase în `src/types/database.ts`.  |

## Structura proiectului

```
src/
├── app/                  # Next.js App Router
│   ├── (auth)/           # rute de autentificare (Faza 1)
│   ├── (dashboard)/      # rute autentificate (dashboard, tranzacții, ...)
│   ├── api/              # route handlers
│   ├── layout.tsx        # root layout (locale ro, dark default)
│   ├── manifest.ts       # PWA manifest
│   ├── sw.ts             # Serwist service worker entry
│   └── globals.css       # Tailwind v4 + tokens shadcn (slate)
├── components/
│   ├── ui/               # shadcn/ui (button, card, dialog, ...)
│   └── features/         # transactions, budgets, goals, ai-chat, ...
├── lib/
│   ├── supabase/         # client / server / middleware (`@supabase/ssr`)
│   ├── ai/               # providers, prompts, tools (server-only)
│   ├── money.ts          # helpers Dinero.js v2 (integer minor units)
│   ├── fx.ts             # BNR + Frankfurter
│   └── utils.ts          # cn(), helpers shadcn
├── db/
│   ├── migrations/       # SQL Supabase (Faza 1+)
│   └── seed/             # categorii românești, merchanți pre-seed
├── hooks/                # React hooks reutilizabile
├── stores/               # Zustand
├── types/
│   └── database.ts       # generat de `npm run db:types`
└── proxy.ts              # session refresh @supabase/ssr (Next.js 16: middleware → proxy)
```

## Stack (Faza 0)

- **Framework**: Next.js 16.2.4 (App Router, React 19.2, Turbopack default)
- **Stil**: Tailwind CSS v4 (CSS-first `@theme`), shadcn/ui (preset
  `radix-nova`, slate base, dark default)
- **Date**: Supabase (Postgres 16, Auth, Storage, Edge Functions,
  pg_cron, pgvector) prin `@supabase/ssr`
- **State**: TanStack Query 5, Zustand 5, React Hook Form + Zod
- **PWA**: `@serwist/next` + `serwist` (NU `next-pwa`)
- **Bani**: `dinero.js@2.0.0-alpha.14` cu unități minore în BIGINT
- **AI**: Vercel AI SDK 6 (Anthropic + OpenAI + Groq)

## De ce build-ul folosește `--webpack`

`@serwist/next` (default mode) este construit pe webpack plugin API.
Turbopack rămâne implicit în development (unde Serwist este dezactivat,
deci nu intervine), dar `next build --webpack` este necesar pentru ca
service worker-ul să fie generat corect în producție.

## Pași următori

Faza 0 doar configurează schela. Pentru Faza 1 (Supabase schema, magic-link
auth, household auto-creation) urmează planul din [CLAUDE.md](./CLAUDE.md) §5.
