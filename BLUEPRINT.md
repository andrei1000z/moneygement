# Banii: The Definitive Blueprint for a Romanian Personal Finance PWA

A research-backed master plan for building the best possible personal finance app for Andrei (14, Next.js developer) and his mother — a Romanian-first, mom-friendly, AI-powered, multi-currency PWA on Next.js 16 + Supabase, vibe-coded with Claude Code. **The single most consequential finding: Enable Banking is the only viable free Open Banking option for Romanian banks today** (GoCardless/Nordigen closed signups in July 2025), and **per-user embedding-based categorization beats pure LLM categorization** at 30% lower cost (Mercado Libre case study). Combine YNAB's discipline, Copilot's beauty, Monarch's collaboration, Lunch Money's developer ergonomics, and Maybe Finance's data model — then layer Romanian-specific features (BNR rates, tichete de masă, Pilon III, Mărțișor budgets) that no global app delivers. The result is an installable, offline-capable PWA that treats finance as a calm, collaborative ritual between mother and son.

---

## 1. Executive summary: what makes the perfect personal finance app

The 2025–2026 winners share five traits. **Hero numbers**: a single dominant figure on every screen ("Free to Spend," "Ready to Assign," "În buzunar"). **Forward-looking views**: Quicken Simplifi's 12-month projection, Copilot's pacing chart, MoneyWiz's combined cleared+pending+scheduled forecast — past spending is commoditized; predicting next month is the new edge. **Per-user AI**: Copilot's private ML model that learns YOUR categorizations beats global classifiers, and Mercado Libre proved embeddings + KNN beats raw GPT-4o-mini at 30% lower cost. **Calm collaboration**: Monarch's Shared Views (Oct 2025) and Honeydue's per-account share controls turn money from conflict into routine. **Indie warmth**: Lunch Money's pay-what-you-want pricing, public API, and Discord prove that 2 users with one shared codebase can outperform $100M-funded apps on the things that matter.

The app you're building has an unfair advantage: **two users, one household, no monetization pressure**. That eliminates ~80% of competitor complexity (subscription tiers, marketing pages, KYC, multi-tenant scaling) and lets you spend that budget on features competitors can't afford to ship: per-user fine-tuned AI, full Romanian localization with BNR-canonical FX, tichete-de-masă-as-first-class-account, and a Claude-powered household chat assistant.

---

## 2. Comprehensive feature matrix — best of every app

The matrix below is organized by capability, with the best implementation per row noted. **Bold = adopt directly. Italic = adapt with modifications.**

| Capability | Best implementation | Source |
|---|---|---|
| **Budgeting paradigm** | Two modes: target-based default (mom-friendly), envelope/zero-based optional | *Monarch Flex + YNAB Rules* |
| **Hero number** | "Liber de cheltuit" (Free to Spend) on dashboard | **Copilot** |
| **Cash flow forecast** | 90-day projection with low-balance alerts | **Quicken Simplifi** |
| **Schema for accounts** | Polymorphic Accountable supertype (depository, credit, loan, investment, property, vehicle) | **Maybe Finance** |
| **Schema for transactions** | TransactionGroup → Journal → 2 Transactions for splits + double-entry | **Firefly III** |
| **Transfer handling** | Auto-detected, first-class, uncategorized, excluded from budget analytics | **Maybe Finance** |
| **Categorization** | Rules → embeddings/KNN → LLM fallback (3-tier hybrid) | *Mercado Libre approach* |
| **Recurring detection** | Median-gap algorithm (3+ occurrences, ±5% amount, cadence variance <0.15) | *Plaid + Subaio* |
| **Subscription cancellation** | Surface monthly cost + price-hike alerts (skip the negotiation concierge) | *Snoop + Rocket Money* |
| **Goals** | 5 bucket types: Standard, Goal, Monthly, Goal-Monthly, Debt | **Buckets** |
| **Sinking funds** | Annual envelopes for irregular yearly bills | **Goodbudget** |
| **Net worth** | Line chart with shaded assets above zero, liabilities below | *Mint + Empower pattern* |
| **Money flow viz** | Sankey: income → categories with color-coded outflows | **Lunch Money + PocketSmith** |
| **Spending intensity** | GitHub-style calendar heatmap, drill-down to day | *cal-heatmap* |
| **Transaction list** | Logo circle + bold payee + tabular amount + swipe actions | **Monzo + Copilot** |
| **Sign-on convention** | "+" income / "−" expense, neutral color for normal expenses, red only for "bad" | *Copilot's accessibility mode* |
| **Multi-currency** | Store integers in minor units; original + base + rate per txn | *Stripe + Dinero.js v2* |
| **Receipt OCR** | GPT-4o vision returns line-items, user confirms split | **Monarch (Dec 2025)** |
| **Voice entry** | Web Speech API → GPT-4o-mini structured parse → tap to confirm | *Cleo 3.0* |
| **AI chat** | Tool-calling (query_transactions, simulate_scenario), never naive context dumping | *Maybe Finance + CopilotKit* |
| **Weekly recap** | Monday morning auto-generated, 4 bullets, warm-friend tone | **Monarch + Cleo** |
| **Sharing** | Per-account share level (none / balance / full); transaction comments | **Honeydue + Monarch** |
| **API/extensibility** | Public REST API + MCP server for Claude integration | **Lunch Money + BudgetBakers** |

---

## 3. New innovative ideas to add on top

These features either don't exist anywhere or exist in fragmented form. They're calibrated for the actual users (mom + son, Romania, household).

**Romanian-native intelligence.** A **BNR-canonical FX engine** that fetches `nbrfxrates.xml` daily after 14:00 EET, stores per-day rates, and computes `base_amount` at the rate of the transaction date — the legally correct accounting practice no global app honors. **Tichete de masă as a first-class account** with separate balance, 12-month expiry warnings, and merchant matching that prevents inflating "out-of-pocket groceries." **Pilon III deductibility tracker** with a running total against the 400 EUR/year cap and a year-end "Mai poți deduce X lei" prompt. **Salary-day intelligence** that learns the son's payday and the mother's pension delivery date (Poșta Română's first-2-weeks pattern) to time forecasts and notifications. **Romanian seasonal sub-budgets**: Buget de Crăciun, Buget de Paște, Buget de Black Friday (the world's earliest, first Friday of November in Romania, with eMAG alone doing >986M lei in one day in 2025).

**Calm AI behaviors.** **Rage-spending detection** flags ≥3 purchases in <30 min from the same category and surfaces a non-judgmental "ești OK?" card. **Lifestyle inflation detector** runs rolling 12-month trends per category and warns when discretionary creep exceeds X%/year. **Spending anniversaries** ("acum un an, cina la X — 200 lei") drive emotional re-engagement without gamification pressure. **"What if I cut X?" simulator** with a deterministic compound-interest engine; the LLM only translates the question and explains the result, never invents numbers.

**Household-specific patterns.** **Approve-workflow for shared transactions**: when a transaction enters a shared account, the other person can swipe-to-classify (mine / yours / ours) — no app does this well today. **Asymmetric visibility for caregiving**: the son sees everything in the household; the mother sees only what he explicitly shares (mirroring YNAB Together's parent-teen pattern, but adapted for the inverse adult-child caregiver role that Reseda Group cited when acquiring Tandem in November 2025). **Per-transaction comments and emoji reactions** so the mother can ask "ce a fost asta?" without a phone call.

**Indie-quality polish.** **Local-first quick-add** that writes to IndexedDB and syncs in the background, so the app responds instantly even on bad connections. **Custom numeric keypad** for amount entry (Cash App / Splitwise pattern) with a calculator row, removing the system keyboard friction. **MCP server** exposing the user's data so the son can chat with finances through Claude Desktop. **Pinned quick-add presets** ("☕ Cafea 12 lei", "🚌 Transport 5 lei") configurable in settings — one-tap entry for the highest-frequency transactions.

**Forward-looking views.** **30/60/90-day cash flow forecast** combining detected recurring streams + scheduled bills + regression-based discretionary projection, with confidence bands and proactive low-balance alerts. **FIRE / Coast FIRE / Lean FIRE projection** dashboard for the son's tech-savvy aspirations, calculated against Romanian inflation context (CPI hit ~10% in 2022–23, far higher than US — inflation-adjusted toggles matter more here).

---

## 4. Features explicitly cut, with reasoning

**Marketing surface area is gone.** No about page, no contact page, no marketing landing page, no terms-of-service overlay, no cookie banner, no analytics consent prompts. The household-use exemption under GDPR Article 2(2)(c) covers a 2-user personal app; ANSPDCP only intervenes if you process third-party data. **Authentication is magic-link only**, no password reset flow, no email verification gate beyond the link itself, no CAPTCHA.

**Subscription tiers and pricing logic are gone.** No free/pro distinction, no upgrade modals, no Stripe integration, no billing portal. Every feature is available to both users by default. **No social features**: no friend leaderboards, no public sharing, no Reddit-style comparisons, no streaks-as-pressure. Light celebration only on goal completion.

**Onboarding tutorials are minimized.** No multi-step product tour, no overlay tooltips, no forced-tutorial gate. The dashboard shows a 3-item checklist (add income, add expense, set goal) that auto-dismisses; everything else is discovered by use. **No KYC, no document upload, no identity verification** — this is not a bank.

**Settings overload is gone.** No 400-toggle preference panel (MoneyWiz's mistake). The settings page has six clean groups: Profile, Preferences (currency, locale, theme), Categories, Rules, Connections, Export. Anything else lives inline at the point of use.

**Bill negotiation, credit score, lending, BNPL, and crypto-as-investment-portfolio are excluded.** They're either Rocket Money's business model (bill negotiation requires a US-based human team), unavailable in Romania (FICO doesn't exist; Biroul de Credit is restricted), regulated (lending = ASF license), or low-value for V1. **Investment portfolio tracking is deferred to V3+** — the son's BVB / Revolut investments can live in a manual "investment" account with an updateable balance until then. **ANAF e-Factura integration is skipped** for personal use; the verdict from research is that it's only useful for PFAs and requires a USB qualified-signature certificate to even authenticate.

**Bullet-pointed feature creep gets a hard cap.** No carbon footprint API (free options are inaccurate, Doconomy/Åland is B2B-only), no friend chat (out of scope for two users), no robo-advisor recommendations (regulated by ASF), no automatic debit card issuance, no joint banking (requires bank charter).

---

## 5. Recommended tech stack and architecture

The recommended stack is **Next.js 16 (App Router, Turbopack, React 19) + TypeScript 5.6+ + Tailwind CSS v4 (CSS-first @theme directive) + shadcn/ui + Supabase (Postgres 16, Auth, Storage, Realtime, Edge Functions, pg_cron, pgvector)**. Build the PWA with **Serwist** (`@serwist/next`), not next-pwa — next-pwa requires `--webpack` on Next.js 16, which forfeits Turbopack. Use **TanStack Query v5** with the `@supabase/ssr` browser/server clients for all server state, **Zustand** for tiny UI state, and **React Hook Form + Zod** for forms. **Dinero.js v2** handles money math with integer minor units. **Recharts via shadcn/ui charts** covers line/bar/area/donut; **Nivo** (or ECharts) handles Sankey, sunburst, and treemap; **react-calendar-heatmap** does the GitHub-style daily-spend grid.

**AI stack**: **Vercel AI SDK 6** with three providers — Groq (Llama 3.3 70B for chat and simple categorization, fast and cheap), Anthropic Claude Sonnet 4.5 (high-stakes categorization, monthly recaps, ambiguous parsing), OpenAI `text-embedding-3-small` (1536-dim vectors written to pgvector for semantic transaction search and KNN categorization). **Bank sync** via Enable Banking's free restricted-production mode (whitelist your own + your mother's accounts after SCA, valid 180 days, all major Romanian banks via Berlin Group PSD2). **Exchange rates** primary from BNR (`https://www.bnr.ro/nbrfxrates.xml`, daily ~13:00 EET, weekdays only, with the year archives at `files/xml/years/nbrfxrates2025.xml`); fallback to Frankfurter (ECB-derived, 24/7).

**Hosting**: Vercel for Next.js, Supabase for the database and Edge Functions. **Backups**: enable Supabase PITR (Pro tier, 7-day window) and a weekly `pg_dump` to a private storage bucket. **Push notifications**: web-push with VAPID keys (Vercel env), service worker handles `push` events, request permission only after iOS users add to home screen (16.4+).

**Security checklist**: RLS enabled on every public table with `app.user_household_ids()` security-definer helper; service-role key never enters the client bundle (`import "server-only"`); IBAN encrypted via pgcrypto with key in Supabase Vault; bank API tokens in Vault; HTTPS-only with Strict-Transport-Security; CSP with `frame-ancestors 'none'`; receipts bucket private with 1-hour signed URLs; magic-link OTP expiry ≤1h; types generated via `supabase gen types typescript`.

---

## 6. Recommended database schema

The schema below is a condensed version of the full SQL in the research. Copy it into a Supabase migration file. **Key design choices**: a `households` table sits above users so the son and mother are co-members; every finance table has a `household_id` foreign key and matching RLS policy; transactions store amounts as `BIGINT` minor units (signed, negative = expense), with `original_amount/currency/exchange_rate/base_amount` for multi-currency; the `base_amount` is auto-computed via a `BEFORE INSERT/UPDATE` trigger that looks up the BNR rate for `occurred_on`.

```sql
-- Extensions
create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists pg_trgm;
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- Households + members (the son and mother share one household)
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null, base_currency char(3) not null default 'RON',
  locale text not null default 'ro-RO', timezone text not null default 'Europe/Bucharest',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table household_members (
  household_id uuid references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('owner','admin','member','viewer')) not null,
  joined_at timestamptz default now(), primary key(household_id,user_id));

-- Profiles, accounts, categories, merchants, tags
create table profiles (id uuid primary key references auth.users(id) on delete cascade,
  full_name text, default_currency char(3) default 'RON', language text default 'ro',
  active_household uuid references households(id));
create type account_type as enum ('checking','savings','credit_card','cash','investment','loan','wallet','meal_voucher');
create table accounts (id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade, owner_id uuid references auth.users(id),
  name text not null, type account_type not null, currency char(3) not null,
  bank_name text, iban_last4 text, iban_encrypted bytea,
  initial_balance bigint default 0, current_balance bigint default 0,
  is_shared boolean default true, is_active boolean default true,
  color text, icon text, archived_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now());
create type category_type as enum ('income','expense','transfer');
create table categories (id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  parent_id uuid references categories(id), name text not null, type category_type not null,
  icon text, color text, budget_amount bigint, is_system boolean default false,
  archived_at timestamptz, unique(household_id,parent_id,name));
create table merchants (id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id), name text not null,
  normalized_name text generated always as (lower(regexp_replace(name,'[^a-z0-9]+','','gi'))) stored,
  logo_url text, default_category_id uuid references categories(id), website text);
create index on merchants using gin (normalized_name gin_trgm_ops);

-- Transactions (the heart)
create type tx_status as enum ('cleared','pending','scheduled','void');
create type tx_source as enum ('manual','import','bank_sync','recurring','transfer');
create table transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  account_id uuid not null references accounts(id),
  user_id uuid not null references auth.users(id),
  occurred_on date not null, posted_at timestamptz,
  amount bigint not null,                            -- signed minor units in account currency
  currency char(3) not null,
  original_amount bigint, original_currency char(3), exchange_rate numeric(18,8),
  base_amount bigint,                                -- household.base_currency, auto-computed
  payee text, merchant_id uuid references merchants(id),
  category_id uuid references categories(id), notes text, tags text[] default '{}',
  status tx_status default 'cleared', source tx_source default 'manual',
  external_id text, bank_connection_id uuid,
  is_transfer boolean default false, transfer_pair_id uuid references transactions(id),
  receipt_url text, location jsonb,
  ownership text check (ownership in ('mine','yours','shared')) default 'mine',  -- the household label
  embedding vector(1536),                            -- semantic search + KNN categorization
  created_at timestamptz default now(), updated_at timestamptz default now(),
  unique(account_id, external_id));
create index tx_household_date_idx on transactions (household_id, occurred_on desc, id desc);
create index tx_account_date_idx on transactions (account_id, occurred_on desc, id desc);
create index tx_category_date_idx on transactions (household_id, category_id, occurred_on desc);
create index tx_payee_trgm_idx on transactions using gin (payee gin_trgm_ops);
create index tx_tags_idx on transactions using gin (tags);
create index tx_embedding_idx on transactions using hnsw (embedding vector_cosine_ops);

-- Budgets, goals, recurring, rules, exchange rates, bank connections, attachments, comments
create table budgets (id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  category_id uuid references categories(id), month date not null,
  amount bigint not null, rollover boolean default false,
  unique(household_id, category_id, month), check(extract(day from month)=1));
create table goals (id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  name text not null, target_amount bigint not null, current_amount bigint default 0,
  currency char(3) default 'RON', target_date date,
  account_id uuid references accounts(id), category_id uuid references categories(id),
  bucket_type text check (bucket_type in ('standard','goal','monthly','goal_monthly','debt')) default 'goal',
  archived_at timestamptz);
create type recurrence_freq as enum ('daily','weekly','biweekly','monthly','quarterly','yearly');
create table recurring_transactions (id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id), account_id uuid references accounts(id),
  category_id uuid references categories(id), payee text, amount bigint not null, currency char(3) not null,
  frequency recurrence_freq not null, interval int default 1,
  start_date date not null, end_date date, next_date date not null,
  last_run_at timestamptz, is_active boolean default true);
create table rules (id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id), name text not null, priority int default 100,
  is_active boolean default true,
  match_payee_regex text, match_account_id uuid references accounts(id),
  match_min_amount bigint, match_max_amount bigint, match_currency char(3),
  set_category_id uuid references categories(id),
  add_tags text[] default '{}', set_notes text);
create table exchange_rates (rate_date date, base char(3), quote char(3),
  rate numeric(18,8) not null, source text default 'BNR',
  primary key(rate_date, base, quote));
create type bank_conn_status as enum ('pending','active','expired','error','revoked');
create table bank_connections (id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id), user_id uuid references auth.users(id),
  provider text default 'enable_banking', institution_id text not null,
  institution_name text, requisition_id text unique,
  status bank_conn_status default 'pending', expires_at timestamptz, last_synced_at timestamptz);
create table attachments (id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id),
  transaction_id uuid references transactions(id) on delete cascade,
  storage_path text not null, mime_type text, size_bytes bigint, uploaded_by uuid references auth.users(id));
create table tx_comments (id uuid primary key default gen_random_uuid(),
  transaction_id uuid references transactions(id) on delete cascade,
  user_id uuid references auth.users(id), body text not null, emoji text,
  created_at timestamptz default now());
create table push_subscriptions (id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text unique, p256dh text, auth text, user_agent text);
```

The full migration includes RLS policies, a `handle_new_user` trigger that auto-creates a profile + personal household, a `fn_tx_balance` trigger that maintains `accounts.current_balance`, a `fn_tx_base_amount` trigger that computes `base_amount` from `exchange_rates`, an `fx_at(_from, _to, _date)` SQL function for cross-rate lookups, a `match_transactions` RPC for semantic search via pgvector, and a `cashflow(_hh, _from, _to)` RPC for monthly rollups. Schedule three cron jobs: `fx-update-daily` at 10:30 UTC weekdays, `recurring-tick` hourly to materialize due recurring entries, and `bank-sync` every 6 hours (well under Enable Banking's per-account rate limits).

---

## 7. Open Banking provider recommendation for Romania

**Use Enable Banking** (`https://enablebanking.com`). It is, as of April 2026, the only practical option for an indie developer needing automatic sync of Banca Transilvania, ING Romania, and Revolut without a TPP license.

The decisive facts: **GoCardless Bank Account Data (formerly Nordigen) closed to new signups in July 2025**; existing accounts still work but new registrations hit a "signups disabled" page. **Plaid does not list Romania** in its European coverage (UK, DE, FR, ES, IE, NL, EE, PL only). **Tink covers 18 markets, not Romania**. **TrueLayer is UK/W-Europe payments-focused**. **Yapily lists 19 countries excluding Romania**. **Salt Edge is Romanian-friendly but B2B-only** with no PSD2 access for personal/indie use. **Revolut's own Open Banking API requires eIDAS or OBIE certificates** — meaning indie developers cannot integrate it directly.

Enable Banking's restricted-production mode is the unlock. You register an app, generate an RSA keypair, upload the public key, and then "activate by linking accounts" — which whitelists the specific accounts you and your mother authenticate against. Once whitelisted, the application enters "active in restricted mode" and **stays free indefinitely** for those accounts. Sessions are valid 180 days (matching the new EBA RTS amendment of July 2023 that extended SCA from 90 to 180 days). Coverage is comprehensive across Romania: BT, BCR (Erste), ING, BRD, Raiffeisen, UniCredit, OTP (now folded into BT after the 2024 acquisition), CEC, Alpha (now folded into UniCredit), Garanti (folded into Raiffeisen), and Revolut at the Revolut Bank UAB EU entity.

The integration flow is a JWT auth header (RS256-signed with your private key) calling four endpoints: `POST /auth` to start authentication and get a redirect URL to the bank's SCA flow; `POST /sessions` to exchange the auth code for a 180-day session; `GET /accounts/{uid}/balances` and `GET /accounts/{uid}/transactions` for data. Sample code lives at `github.com/enablebanking/enablebanking-api-samples`. Schedule daily syncs via Supabase pg_cron + Edge Function — well within typical 4-call/day rate limits.

**Always pair this with a CSV importer fallback.** Build robust parsers for BT24 web CSV (`Conturile mele → Căutare tranzacții → Export CSV`, watch for the dot-decimal format), BCR George (PDF/Excel/CSV with comma decimals), ING Home'Bank (quirky multi-line format; reference parser at `github.com/dvulpe/homebankcsv_parser`), CEC Mobile, Raiffeisen Smart Mobile, and Revolut (CSV/Excel via app `Account → Statements`). The mother may resist SCA flows, the 180-day reauth can lapse, and bank API outages happen — CSV is your safety net. **Watch one Revolut quirk**: the first 5 minutes after consent gives full transaction history; after that you're limited to last 90 days at max 4 polls/day per account.

Romania-specific bank statement decoding to plan for: BT prefixes its merchant lines with `Plata POS comerciant`, BCR uses `CUMP. POS`, ING uses `POS PURCHASE`. The merchant string is one giant uppercase text with the legal entity name (often differing from the brand — `DANTE INTERNATIONAL` is eMAG, `HCL ONLINE ADVERTI` is Tazz). Build a tiered matcher: brand keyword > legal entity name > MCC fallback > free-text. Most Romanian banks ship statements without diacritics; ensure your DB stores UTF-8 and your parser is permissive on `ş/ţ` (legacy cedilla) vs `ș/ț` (correct comma-below).

---

## 8. Detailed feature spec — screens, flows, components, visualizations

### Navigation skeleton

**Mobile** uses a bottom tab bar (96% of fintech apps do, per Corporate Insight 2025) with a center FAB: Home / Transactions / **+** / Budgets / More. The "+" is a 56px raised circle that opens the quick-add sheet; long-press surfaces a radial of "income / expense / transfer / scan receipt." The tab bar respects `env(safe-area-inset-bottom)` and never hides on scroll. **Desktop** uses a 240px left sidebar (collapsible to a 64px rail) with a Cmd-K command palette for keyboard navigation.

### Dashboard (Home)

The dashboard answers "ce se întâmplă cu banii noștri?" in five seconds. The vertical mobile stack runs: a greeting and **net worth headline with delta and 6-month sparkline** ("Bună, Mama. Patrimoniu: 87.230,50 lei, +2,3% luna asta"); three KPI cards for income/spent/saved; a horizontal stacked **budget pulse bar** with a one-sentence summary ("Mai ai 1.240 lei pentru 12 zile"); a tappable **mini-Sankey** of income → categories; **recent transactions** (last 5, with "Review" badges for uncategorized); **upcoming bills** in the next 7 days; **goals progress** as circular rings; a **calendar heatmap** of daily spend (rolling 12 weeks on mobile, full 365-day strip on desktop). Each card streams independently via React Server Components + Suspense, so the dashboard renders progressively even on 3G.

### Transactions

The list groups by sticky day headers ("Astăzi", "Ieri", "Lun 24 Apr — −320,40 lei"). Each row is a 40px logo or emoji circle, semibold payee with muted category below, tabular right-aligned amount with the cents at 80% size (Monzo trick), and a pending-dot if applicable. Income is green-tinted; expenses use neutral foreground (red is reserved for over-budget and overdrafts — color-blind safe per Okabe-Ito, with a "Display + and −" accessibility toggle borrowed from Copilot v4.3). Transfers render with a "↔" icon, hide from spending totals by default, and link bidirectionally. **Swipe left** on a row reveals Categorize and Hide; **swipe right** marks Reviewed and Add Tag. **Long-press** enters bulk-select mode with a floating action bar. **Inline category change** uses a bottom sheet listing recently-used categories first with search. **Splits** open a full-screen modal with a live "X / Y lei • Z left" pill and an auto-balance button.

### Budgets

Default mode is target-based (Monarch-style, mom-friendly): a summary header showing "Aprilie 2026 • Bugetat 4.500 • Cheltuit 3.120 • Rămas 1.380 lei" with a stacked progress bar, then collapsible category groups (Esențiale, Stil de viață, Obligații, Economii). Each category row pairs an emoji circle, name, "320 / 500 lei" amounts, and a horizontal progress bar that turns green ≤75%, amber 75–100%, red >100%, violet for rolled-over amounts. Drag-to-reassign on desktop; tap-and-bottom-sheet "Move money" on mobile. A toggle per category enables monthly rollover. **Advanced users switch to YNAB-style envelope mode** which swaps the progress bars for an "Assigned | Spent | Available" three-column table with a "Ready to Assign" banner at the top.

### Goals

A card grid with hero emojis ("🏖️ Vacanță Grecia"), large progress rings, "2.450 / 5.000 lei", an ETA ("la 200 lei/lună → iulie 2026"), and a one-tap "Adaugă bani" CTA. Five bucket types from Buckets app: Standard (parking), Goal (target + date), Monthly (auto-fill), Goal-Monthly hybrid, and Debt (with payoff projection using both snowball and avalanche algorithms side-by-side, showing time-to-debt-free and total-interest savings). The goal-creation flow is exactly three steps: name + emoji, target + date, funding source — never more.

### Quick-add (the most-used flow)

The target is **<5 seconds, ≤3 taps**. Screen 1 is dominated by a 48px display-2xl amount input with a custom on-screen numeric keypad (NOT the system keyboard) — 64×64px buttons in a 1-2-3 / 4-5-6 / 7-8-9 / `,` 0 ⌫ grid with an inline `+ − × ÷` calculator row above. Below sit pinned quick-add presets ("☕ Cafea 12 lei", "🍔 Prânz 35 lei") for one-tap entry, an account picker pill (defaults to most-recently-used), and a segmented Cheltuială | Venit | Transfer toggle. Screen 2 shows a category grid (recent first, then alphabetical with search), a "Today" date pill, a notes field, optional tags, a 📷 button for receipt OCR, and a 🎤 button for voice input. The voice path uses Web Speech API to capture Romanian audio, GPT-4o-mini structures it into `{amount, currency, merchant, category, date}`, and the user confirms with a single tap. Save commits and either closes the sheet or stays open for "Save & add another" (Splitwise pattern).

### Visualizations

The chart library map: **Recharts via shadcn/ui** for line/bar/area/donut and KPI cards; **Nivo** (or ECharts) for Sankey, sunburst, and treemap; **react-calendar-heatmap** or `@uiw/react-heat-map` for the daily-spend grid. **Sankey design**: left nodes are income sources (Salariu, Pensie, Tichete, Dividende), one middle "Net Income" hub, right nodes are categories color-coded by Needs/Wants/Savings buckets; toggling large categories reveals smaller ones. **Net worth chart**: dual-area with assets shaded green above zero, liabilities shaded red below zero, single bold net-worth line on top — the pattern Mint refugees keep asking for. **Calendar heatmap**: opacity-scaled by daily spend, click a day to drill into a bottom sheet of that day's transactions. **Cash flow waterfall** for end-of-month bridges. Every chart respects a period selector (1M / 3M / 6M / YTD / 1Y / All / Custom) and exposes drill-down on tap; tooltips appear on hover (desktop) and tap-and-hold (mobile, with `navigator.vibrate(10)` haptic).

### AI chat

A dedicated `/ai` screen and a global Cmd-K-accessible chat. The system prompt is Romanian-first, warm-friend tone, no jargon, and forbidden from inventing numbers — it must use tool-calls (`query_transactions`, `get_budget`, `get_net_worth`, `simulate_scenario`, `update_transaction`, `set_goal`) for any factual claim. Memory is stored in pgvector with the top-K relevant past exchanges retrieved per call. Sample interactions: "Cât am cheltuit la cafea luna asta?", "Ce abonamente plătim acum?", "Dacă tăiem Netflix, cât economisim în 10 ani?", "Adaugă 50 lei la Mega Image, mâncare." A weekly Monday-morning AI recap pushes a 4-bullet summary highlighting one win, one concern, and one upcoming bill.

### Settings, accessibility, dark mode

Six clean groups: Profile, Preferințe (currency, locale, theme, first-day-of-week, start-of-month), Aspect (theme, accent, number format), Accessibilitate (larger text, high contrast, "+/−" instead of color, reduce motion), Categorii, Reguli, Conexiuni, Export. **Dark mode is the default investment** — deep warm-black `#0B0D10`, layered surfaces with ~6% lightness steps, subtle radial gradient haze on the dashboard background (Copilot pattern), generous 16–20px rounding on cards, soft wide shadows. Light mode uses a warm off-white `#FAFAF7` background that's less harsh than pure white. Typography is **Inter variable** with `font-variant-numeric: tabular-nums slashed-zero` for all money displays — render the cents at 80% size and lighter weight (`1.234,50 lei` becomes `1.234,⁵⁰ lei` visually). Locale `ro-RO` formats numbers with period thousands and comma decimal; dates as `DD.MM.YYYY`; currency suffix `lei` with a non-breaking thin space. Accessibility targets WCAG 2.2 AA: ≥4.5:1 contrast, color independence (every red/green pair has icon + sign reinforcement), 2px focus rings, screen-reader money labels (`aria-label="320 lei și 40 de bani, cheltuială"`), full keyboard navigation, and `prefers-reduced-motion` respect.

---

## 9. Romanian-specific considerations

**Banking landscape**: BT is dominant (~21–24% market share after absorbing OTP in March 2025), followed by BCR (Erste, "George" app), UniCredit (post-Alpha merger), CEC, BRD, Raiffeisen (will absorb Garanti in 2026), ING. **Revolut is the largest single financial app in Romania** with ~5M users as of February 2026, surpassing BT's active card base; ~12% of all global Revolut downloads come from Romania. Multi-currency expectation is non-negotiable — most Romanians hold RON for daily spend and EUR for real estate (almost universally priced and rented in EUR), big purchases, and travel. **BNR is the canonical FX source** (`https://www.bnr.ro/nbrfxrates.xml` daily ~13:00 EET, `nbrfxrates10days.xml`, `files/xml/years/nbrfxrates2025.xml` historical) — cache locally, fetch once per day after 14:00, never poll repeatedly (BNR auto-blocks abusive IPs). The XML quirk: weak currencies (HUF, JPY, KRW) carry a `multiplier="100"` attribute; divide by it for true 1-unit value.

**Default categories** ship in Romanian with bilingual labels: Mâncare (Lidl, Kaufland, Carrefour, Mega Image, Profi, Penny, Auchan), Mâncare la pachet (Wolt, Tazz, Glovo, Bolt Food), Restaurante, Transport (Bolt, Uber, STB, Metrorex, CFR), Combustibil (OMV Petrom, Rompetrol, MOL, Lukoil, SOCAR), Utilități (Engie, E.ON, Electrica, Hidroelectrica, PPC, Premier Energy, Apa Nova, RAJA, Termoenergetica), Internet & Telefonie (Digi/RCS-RDS, Orange, Vodafone, Telekom), Abonamente (Netflix, HBO Max, Disney+, Voyo, AntenaPLAY, Spotify, World Class, 7Card), Sănătate (Catena, Sensiblu, Help Net, Dr.Max, MedLife, Regina Maria, Sanador, Synevo), Cumpărături (eMAG/Dante International, Altex, Flanco, Dedeman, IKEA, Decathlon), Educație, Taxe & Comisioane (ANAF, Ghișeul.ro), Venituri (Salariu, Tichete masă, Pensie), Transferuri & Economii (Pilon III contributions, depozite), Imobiliare (Chirie, Rate ipotecă), Copii & Familie, Cadouri & Donații (Mărțișor, Crăciun), Numerar.

**Format defaults**: decimal comma, period thousands (`1.234,56 lei`), date `DD.MM.YYYY`, week starts Monday, 24-hour clock, currency suffix `lei` (no widely recognized one-character glyph), full Romanian diacritics in UI (`ă, â, î, ș, ț` — comma-below, not legacy cedilla). Use `Intl.NumberFormat('ro-RO', {style:'currency', currency:'RON'})` for the heavy lifting and post-process to swap `RON` for `lei`.

**Romanian-specific feature ideas baked in**: tichete de masă as a separate account with auto-detection of Edenred/Pluxee/Up transactions, RON balance tracking, and 12-month expiry warnings (a non-trivial UX win, since unused tickets vanish); Pilon III deductibility tracker with 400 EUR/year cap warnings; salary-day intelligence detecting recurring large deposits from same payer plus mother's pension date (Poșta Română's first-2-weeks pattern); seasonal sub-budgets for Crăciun, Paște, Black Friday, Mărțișor; Romanian holidays calendar (1, 2 ianuarie; 24 ianuarie; 1 mai; Paștele; 1 iunie; Rusalii; 15 august; 30 noiembrie; 1, 8 decembrie; 25, 26 decembrie). **ANAF integration is explicitly skipped** for this app — the public CIF endpoint is unauthenticated but only useful for VAT lookups, and the SPV/e-Factura APIs require a USB qualified-signature certificate (CertSign, DigiSign, Trans Sped) that is impractical for a 2-user personal app. Re-add later if Andrei goes PFA.

**Privacy and law**: GDPR Article 2(2)(c) household-use exemption covers a 2-user personal app — no ANSPDCP registration, no DPO, no cookie banner needed. PSD2 AISP licensing is sidestepped by riding on Enable Banking's Finnish AISP license. PCI DSS is irrelevant because you never store card numbers (Apple Pay / Google Pay tokenization handles it). Encrypt at rest via Supabase defaults plus pgcrypto for IBANs with the key in Supabase Vault.

---

## 10. Multi-currency implementation strategy

**Three immutable rules** drive the strategy: (1) every monetary value is stored as `BIGINT` in minor units (bani for RON, cents for EUR) — never floats, never decimal types — using the Stripe convention; (2) every transaction stores three amounts: `amount + currency` in the account's currency, optional `original_amount + original_currency + exchange_rate` if the merchant charged a different currency, and `base_amount` in the household's base currency (RON); (3) `base_amount` is computed by a `BEFORE INSERT/UPDATE` trigger that looks up the rate on `occurred_on` from the `exchange_rates` table — never recomputed later, because historical accuracy matters for accounting.

The exchange-rate pipeline runs daily: a Supabase Edge Function `fx-update` is invoked by `pg_cron` at 10:30 UTC weekdays (≈13:30 Europe/Bucharest, after BNR posts). It fetches `nbrfxrates.xml`, parses it with `fast-xml-parser`, normalizes the multiplier attribute, and upserts rows into `exchange_rates(rate_date, base, quote, rate, source)` with `base = 'RON'`. The `fx_at(_from, _to, _date)` SQL function computes cross-rates by composing two RON-pivot lookups (`_from → RON → _to`), falling back to the most recent business-day rate ≤ `_date` for weekends and holidays. **Frankfurter** (`https://api.frankfurter.app/latest?from=RON`) is the 24/7 fallback when BNR is down or for currencies BNR doesn't quote.

**Money library**: Dinero.js v2 (alpha but production-ready in functionality — pin a specific version) provides immutable, tree-shakeable, TypeScript-first money math. The `formatMoney(amount, code, locale)` helper wraps `Intl.NumberFormat` with `currencyDisplay: 'narrowSymbol'` for clean output. The `\<CurrencyInput>` form component uses `inputMode="decimal"`, `lang="ro-RO"`, `tabular-nums`, accepts comma-decimal input, and emits minor units to the form state.

**Travel mode** auto-detects a trip when ≥2 days of POS transactions cluster outside Romania, prompts to create a per-trip envelope ("Vacanță Grecia, 1.000 EUR"), auto-tags transactions during the window with `#trip_grecia_2026`, suppresses some anomaly alerts (frequent foreign transactions, higher daily spend are normal), and produces a post-trip recap showing total spend in both local and base currency. **EUR-priced rent tracking** ships as a first-class feature: explicit "Chirie 350 EUR/lună, plătit în RON la curs X" field shows surprise costs from FX moves over time.

---

## 11. Complete prioritized feature list — MVP vs nice-to-have

### MVP — ship in the first 8 weeks of vibe-coding

**Authentication and accounts**: Supabase magic-link auth, household auto-creation, mother invite flow with role-based access; manual account creation for checking, savings, credit card, cash, investment, loan, wallet, and meal voucher types; CSV importer with auto-detected schemas for BT24, BCR George, ING Home'Bank, CEC Mobile, Raiffeisen Smart Mobile, and Revolut; Enable Banking integration for BT, ING, Revolut auto-sync with 180-day SCA renewal reminders.

**Transactions and categorization**: full CRUD with optimistic updates via TanStack Query, day-grouped infinite-scroll list with virtualization, search, filter chips (account, category, date, amount, tags, status), bulk actions, swipe gestures, splits, transfer auto-detection (matching amount + ±3 days + opposite accounts), Romanian merchant→category default rules shipped pre-seeded, three-tier categorization (rules → embeddings/KNN with pgvector → GPT-4o-mini fallback), inline rule extraction from corrections, transaction-level comments and emoji reactions, ownership labeling (mine/yours/shared) with approve workflow.

**Budgets and goals**: target-based monthly budgets per category with rollover toggle, color-coded progress bars, "Move money" bottom sheet, drag-to-reassign on desktop, YNAB-style envelope mode as opt-in, three-column "Assigned | Spent | Available" view with "Ready to Assign" banner; goals with five bucket types (Standard, Goal, Monthly, Goal-Monthly, Debt), debt snowball + avalanche side-by-side projection, ETA and required-monthly-contribution math.

**Multi-currency and Romanian context**: integer minor-unit storage with `original_amount/exchange_rate/base_amount` triplet, BNR daily fetch via pg_cron + Edge Function, Frankfurter fallback, Romanian-first UI with English toggle, locale `ro-RO` formatting, full diacritics, Romanian default categories with bilingual labels, tichete de masă account type with auto-detection and 12-month expiry warnings, Pilon III deductibility tracker.

**Quick add and entry**: custom on-screen numeric keypad with calculator row, pinned quick-add presets, account/category pickers with most-recently-used first, voice input via Web Speech API + GPT-4o-mini structured parse, receipt photo OCR via GPT-4o vision returning line-items, optional photo attachment.

**Dashboard and visualizations**: hero net-worth headline with sparkline, three KPIs (income/spent/saved), budget pulse bar with one-sentence summary, mini-Sankey income → categories (Nivo), recent transactions card with review badges, upcoming bills carousel (next 7 days), goals progress rings, calendar heatmap (rolling 12 weeks); Recharts/shadcn for line/bar/area/donut, Nivo for Sankey/sunburst/treemap, react-calendar-heatmap for daily grid.

**AI essentials**: Romanian-language LLM mode, natural-language Q&A chat with tool-calling (query_transactions, get_budget, get_net_worth, simulate_scenario, update_transaction), weekly Monday recap auto-posted as a dashboard widget, anomaly detection with statistical baseline + LLM phrasing, subscription detection algorithm with price-hike alerts.

**PWA, push, security**: Serwist service worker, installable manifest with Romanian copy ("Banii — Finanțe Personale"), offline transaction queue via IndexedDB + Background Sync (Android) and `online` event fallback (iOS), web-push notifications for bills and unusual transactions, full RLS on every table with `app.user_household_ids()` helper, IBAN encrypted with pgcrypto + Vault key, magic-link auth, dark mode default with subtle gradients, light mode option, Inter typography with tabular figures, WCAG 2.2 AA accessibility.

### V2 — months 3–4

Bill prediction with linear regression on last 6 months; 30/60/90-day cash flow forecast with confidence bands and proactive low-balance alerts; "what if I cut X?" simulator with deterministic compound-interest engine; FIRE / Coast FIRE / Lean FIRE projection; receipt line-item splitting (one Carrefour receipt → 6 categorized child transactions); geo-tagged spending heatmap on a map; rage-spending detection; lifestyle inflation detector; Romanian seasonal sub-budgets (Crăciun, Paște, Black Friday, Mărțișor); salary-day and pension-day intelligence with countdown widgets; smart round-ups to savings goal; passkey login via SimpleWebAuthn; export to CSV/JSON/PDF.

### V3 — months 5–6 and later

Spending anniversaries; weather correlation; day-of-week heatmap; quarterly money-personality LLM report; subscription trial expiration tracking via email-forwarding parser; investment portfolio tracking with TWR/IRR (manual entry first, then BT Capital Partners or Tradeville API if exposed); MCP server exposing user data to Claude Desktop for power-user access; Romanian charity export for ANAF Form 230 (legal entities only as of 2024); inflation-adjusted views toggle; FIRE community features; ANAF e-Factura integration if Andrei goes PFA.

### Permanently excluded

Marketing pages, about page, contact page, terms-of-service overlay, cookie banner, analytics consent prompt, password authentication, KYC document upload, multi-step product tour, subscription tiers, Stripe billing, friend leaderboards, public sharing, social comments, bill negotiation concierge, US credit score / FICO simulator, BNPL integration, lending products, joint debit card issuance, robo-advisor recommendations, Doconomy carbon API (until pricing changes), Plaid/Tink/TrueLayer/Yapily/Salt Edge bank integrations (only Enable Banking is viable today).

---

## Conclusion: the vibe-coding handoff

The architecture is mature enough that Claude Code can implement it screen by screen in roughly this sequence: scaffold Next.js 16 + Tailwind v4 + shadcn/ui, wire Supabase with `@supabase/ssr` and the full schema migration, ship magic-link auth and household auto-creation, build the transactions CRUD with optimistic updates, layer the three-tier categorization (rules → embeddings → LLM), implement the dashboard with streaming RSC + Suspense, add the quick-add sheet with custom keypad and voice/receipt entry, ship budgets and goals, integrate Enable Banking with the SCA flow, add the AI chat with tool-calling, polish dark mode and PWA install flow, then iterate on Romanian-specific features (BNR FX, tichete de masă, Pilon III). **The single most important architectural choice is treating transfers as first-class uncategorized entities** (Maybe Finance's lesson) and **the single most important UX choice is the hero number on every screen** (Copilot/PocketGuard/YNAB consensus). Everything else flows from there.

Build for two users and make every decision serve them. The mother gets voice input, big buttons, plain Romanian, and minimal jargon; Andrei gets the API, the MCP server, the Sankey diagrams, and the FIRE projection. Both get a calm, beautiful, trustworthy place to look at money together — which, in 2026, is a quietly radical thing to make.