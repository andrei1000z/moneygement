# AUDIT — Banii (26 aprilie 2026)

Auditul a fost făcut prin inspecție directă a codului în `C:\Users\Andrei\Desktop\banii`,
plus rulare `npm run typecheck` și `npm run lint`. Folosit ca sursă de adevăr pentru
promptul de finalizare din `FINISH_PROMPT.md`.

## TL;DR

- **Faze 0–5**: complete și bine implementate. Cod production-grade.
- **Faza 6**: parțială. Lipsesc invite mamă, CSV importer, FX pipeline.
- **Fazele 7–10**: 90% lipsesc.
- **Erori care blochează**: 5 type-check, 1 lint, 3 icon-uri PWA lipsă, 0 commit-uri git.
- **Cod prezent dar gol**: `src/lib/ai/{providers,tools,prompts}.ts` sunt placeholders.

## ✅ Ce e gata și e BUN

### Setup (Faza 0)
- Next 16.2.4 + React 19.2.4 + Tailwind v4 + shadcn/ui (preset radix-nova) ✓
- `proxy.ts` (echivalentul Next 16 pentru `middleware.ts`) ✓
- Serwist configurat în `next.config.ts` cu `disable: isDev` ✓
- `next.config.ts` cu `experimental.cpus: 2` și `typescript.ignoreBuildErrors: true` cu motivație validă (bug ACCESS_VIOLATION pe Windows pe instantieri adânci de generic-uri Zod 4 + RHF + Database types). `npm run typecheck` rămâne sursa de adevăr.
- Manifest PWA în `manifest.ts` ✓ (icon-urile referite NU există — vezi blockers)

### Schema DB (Faza 1)
9 migrații în `supabase/migrations/` (timestamped) și mirror în `src/db/migrations/`:
- `0001_init.sql` — toate tabelele cerute conform BLUEPRINT §6, indexuri HNSW pe `embedding`, GIN pe `pg_trgm`, GIN pe `tags` ✓
- `0002_rls.sql` — RLS pe TOATE tabelele publice + `app.user_household_ids()` security-definer ca single-source-of-truth pentru membership ✓
- `0003_triggers.sql` — `handle_new_user`, `fn_tx_balance`, `fn_tx_base_amount` ✓
- `0004_functions.sql` — `fx_at` (cu strategie directă → inversă → pivot RON), `match_transactions` (cu RLS double-check), `cashflow` (rollup pe categorii cu base_amount și exclude transfer-uri) ✓
- `0005_iban_crypto.sql` — encrypt/decrypt cu pgcrypto + Vault key ✓
- `0010_transfer_detect.sql` — auto-detect transfer pe insert ✓
- `0011_presets.sql` — quick-add presets ✓
- `0012_budget_progress.sql` — RPC pentru envelope mode ✓
- `0099_seed.sql` — 25 categorii românești seed cu trigger automat la creare household ✓

### Pagini și componente
- `(auth)`: login + callback ✓
- `(dashboard)`: accounts, budgets, categories, goals, insights, merchants, transactions — fiecare cu `page.tsx` + `actions.ts` ✓
- Transactions: list virtualizat (TanStack Virtual), filters cu URL state, splits, transaction-detail drawer cu comments, bulk-action-bar, transaction-form, transaction-row cu swipe gestures via `motion` ✓
- Quick-add: numeric-keypad, preset-bar, voice-input, receipt-capture, account-pill, category-grid, quick-add-sheet ✓
- API AI: `/api/ai/parse-voice/route.ts` și `/api/ai/parse-receipt/route.ts` — implementate cu Groq primary + Claude Sonnet fallback, rate limiting, auth check, Zod schemas, category matching la BD prin `ilike` ✓
- Goals: 5 bucket types, debt-payoff (snowball + avalanche side-by-side), goal-celebration ✓
- Budgets: target + envelope mode YNAB-style + Move Money + Auto-assign + rollover ✓
- Dashboard widgets: greeting, net-worth-headline cu sparkline, kpi-card, mini-sankey, calendar-heatmap, recent-transactions, upcoming-bills, goals-progress ✓
- Insights: net-worth-chart, income-vs-expense-chart, category-treemap, period-selector ✓

### Securitate
- `src/lib/supabase/admin.ts` — `import "server-only"` la prima linie, service_role NU ajunge în client bundle ✓
- `src/lib/ai/providers.ts` — `import "server-only"` ✓
- IBAN encrypted cu pgcrypto + key în Supabase Vault ✓
- Search recursiv după `SUPABASE_SERVICE_ROLE_KEY` în `src/`: confirmat că apare doar în `admin.ts` ✓

### Money + FX (parțial)
- `src/lib/money.ts` — wrapper Dinero v2 production-grade: `toMinor`, `fromMinor`, `formatMoney` (cu post-process "RON" → "lei"), `formatMoneyParts` (pentru randare cents la 80% size), banker-style rounding pentru consistență monetară ✓
- 6 currencies suportate (RON, EUR, USD, GBP, CHF, HUF) ✓
- `src/lib/fx.ts` — DOAR URL-uri exportate (`BNR_DAILY_URL`, `BNR_TEN_DAYS_URL`, `FRANKFURTER_BASE_URL`). Pipeline-ul real lipsește.

## 🔴 ERORI CARE BLOCHEAZĂ

### 0. Git: ZERO commit-uri
Toate fișierele sunt untracked. Dacă pică ceva, pierzi 100% din muncă.
**FIX URGENT**: `git add . && git commit -m "checkpoint: Faze 0-5 complete, pre-finalizare"`

### 1. TypeScript: 5 erori (toate la chart props)
- `calendar-heatmap.tsx:71` — `ReactCalendarHeatmapValue<ReactCalendarHeatmapDate>` nou; cast intern necesar pentru `classForValue`/`titleForValue`/`onClick`.
- `mini-sankey.tsx:57` — Nivo Sankey `colors` așteaptă `OrdinalColorScaleConfig`, nu `(node) => node.nodeColor`.
- `category-treemap.tsx:63` — `formattedValue` e `string | number`, nu doar `string`.
- `income-vs-expense-chart.tsx:72` și `net-worth-chart.tsx:75` — Recharts `Formatter` așteaptă `ValueType | undefined`, nu `number`.

### 2. ESLint: 1 error
- `recent-transactions.tsx:29` — quote `"` neescapat în JSX.

### 3. Icon-uri PWA lipsă
`manifest.ts` referă `/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png` — niciunul în `/public/`. Doar SVG-uri default Next.

### 4. AI placeholders goale
`src/lib/ai/{providers,tools,prompts}.ts` au 3-12 linii fiecare. `providers.ts` doar exportă chei env. `tools.ts` și `prompts.ts` sunt comentarii TODO. Folder `src/components/features/ai-chat/` e gol.

## 🟠 Faze NEÎNCEPUTE

| Faza BLUEPRINT | Status | Ce lipsește concret |
|---|---|---|
| 6 — Invite mamă | ❌ | Tabel invites, server action, accept page, settings tab |
| 6 — CSV importer | ❌ | Parsers BT24/BCR/ING/Revolut/CEC/Raiffeisen, UI import |
| 6 — FX pipeline | 🟡 | Doar URL-uri în `fx.ts`. Lipsesc Edge Function `fx-update`, cron, parser BNR XML, fallback Frankfurter, seed istoric |
| 7 — Multi-currency complet | 🟡 | Travel mode, EUR rent tracker — neimplementate |
| 8 — AI 3-tier categorization | ❌ | `categorize.ts`, `embeddings.ts`, `embedding_queue` migration, edge function `process-embeddings` |
| 8 — AI chat | ❌ | Folder gol; lipsește `/(dashboard)/ai/page.tsx`, `/api/ai/chat/route.ts`, `tools.ts` real, system prompt RO, migrația `chat_threads`+`chat_messages` |
| 8 — Weekly recap | ❌ | Edge function `weekly-recap` |
| 8 — Anomaly detection | ❌ | `lib/ai/anomaly.ts` |
| 8 — Subscription detector | ❌ | `lib/ai/subscriptions.ts`, page `/subscriptions` |
| 9 — PWA install prompt | ❌ | Component `install-prompt`, iOS instructions |
| 9 — Offline queue (IndexedDB) | ❌ | `lib/offline/queue.ts`, fără dep `idb` |
| 9 — Push notifications | ❌ | Fără dep `web-push`, `/api/push/subscribe`, permission UI, sw event handler |
| 9 — Enable Banking | ❌ | `lib/banking/`, `/connections/page.tsx`, edge function `bank-sync`, JWT RS256 signing |
| 10 — Tichete masă auto-detect | ❌ | Account type există în enum dar fără provider matchers (Edenred/Pluxee/Up) |
| 10 — Pilon III tracker | ❌ | Tabel `pension_contributions`, page, reminder cron |
| 10 — Salary intelligence | ❌ | Tabel `income_streams`, algoritm detection |
| 10 — Seasonal budgets | ❌ | Catalog Crăciun/Paște/BlackFriday/Mărțișor, auto-prompt |
| 10 — Romanian holidays | ❌ | `lib/holidays/ro.ts` cu Computus pentru Paște |
| 10 — Cashflow forecast 30/60/90 | ❌ | `lib/forecast/cashflow.ts` cu confidence bands |
| 10 — Rage spending | ❌ | `lib/intelligence/rage-spending.ts` |
| 10 — Lifestyle inflation | ❌ | `lib/intelligence/lifestyle-inflation.ts` |
| Settings page | ❌ | Pagina `/settings` nu există deloc — niciun grup (Profil, Preferințe, Aspect, Accesibilitate, Notificări, Export) |
| Subscriptions page | ❌ | |

## 🟡 Polish / cleanup

- 11 warnings ESLint (unused vars, react-compiler hints) — non-blocking
- `merchant-form.tsx`, `transaction-form.tsx`, `transaction-list.tsx` — react-compiler avertizează că `form.watch()` și `useVirtualizer()` nu se memo-izează safe. ACCEPTABIL — sunt API-uri externe; pattern-ul e corect.
- `src/components/features/ai-chat/.gitkeep` orfan
- `lucide-react ^1.11.0` arată suspect (publicarea recentă, era 0.5xx). Verifică să nu fie un fork sau mistake. Dacă e mistake, `npm i lucide-react@latest`.
- Folosește `motion` (nu `framer-motion`) — pachet nou, OK.

## 📦 Dependențe LIPSĂ (vor fi nevoie în etapele D-I)

- `web-push` + `@types/web-push` — push notifications
- `idb` — IndexedDB pentru offline queue
- `papaparse` + `@types/papaparse` — CSV parsing
- `jose` — JWT RS256 pentru Enable Banking
- (opțional) `@upstash/ratelimit` + `@upstash/redis` — momentan există `lib/rate-limit.ts` minim in-memory

## Plan de acțiune

1. **TU**, acum: `git add . && git commit -m "checkpoint: pre-finalizare"`
2. **TU**, acum: verifică `.env.local` are toate cheile (vezi `.env.example` + secțiunea "extern" din chat)
3. **TU**, acum: în Supabase Dashboard activează extensions (`pgcrypto`, `vector`, `pg_trgm`, `pg_cron`, `pg_net`); adaugă în Vault `app.cron_secret` și `app.iban_encryption_key`; creează bucket `receipts` privat; verifică Site URL + Redirect URLs în Auth.
4. **TU**, acum: `npx supabase link --project-ref <ref> && npx supabase db push && npm run db:types`.
5. **CLAUDE CODE**: deschide proiectul, dă-i conținutul din `FINISH_PROMPT.md`. El va lucra pe etape A→J cu commit-uri. Etapa A (fix erori) durează 5 min, restul progresiv.
