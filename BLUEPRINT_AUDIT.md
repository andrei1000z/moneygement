# BLUEPRINT_AUDIT.md — fiecare capability mapată la fișierul real

Generat 27 aprilie 2026, după 19 commit-uri livrate. Fiecare bullet din
BLUEPRINT.md §11 (MVP) e pus pe scenă cu fișierul concret.

## §6 Schema DB

| Tabel BLUEPRINT | Migrație | Status |
|---|---|---|
| `households` | `0001_init.sql:31` | ✅ |
| `household_members` | `0001_init.sql:45` | ✅ |
| `profiles` | `0001_init.sql:56` | ✅ |
| `accounts` cu enum `account_type` (8 valori) | `0001_init.sql:71-90` | ✅ |
| `categories` cu enum `category_type` | `0001_init.sql:104` | ✅ |
| `merchants` cu `normalized_name` GIN trgm | `0001_init.sql:122-136` | ✅ |
| `transactions` cu `amount`/`base_amount`/`embedding` | `0001_init.sql:142-185` | ✅ |
| `budgets` (rollover) | `0001_init.sql:194` | ✅ |
| `goals` (5 bucket types) | `0001_init.sql:209` | ✅ |
| `recurring_transactions` | `0001_init.sql:231` | ✅ |
| `rules` (priority + match_payee_regex) | `0001_init.sql:254` | ✅ |
| `exchange_rates` | `0001_init.sql:276` | ✅ |
| `bank_connections` cu enum `bank_conn_status` | `0001_init.sql:293` | ✅ |
| `attachments` | `0001_init.sql:318` | ✅ |
| `tx_comments` (cu emoji) | `0001_init.sql:333` | ✅ |
| `push_subscriptions` | `0001_init.sql:346` | ✅ |
| `household_invites` | `0007_invites.sql` | ✅ |
| `embedding_queue` + chat tabele + recaps + detected_subscriptions | `0008_ai.sql` | ✅ |
| `notification_preferences` + bank sync fields | `0021_notification_prefs_banking.sql` | ✅ |
| `meal_voucher_lots` cu FIFO + expires_on | `0022_meal_voucher_lots.sql` | ✅ |
| `pension_contributions` cu year generated column | `0023_pension_pilon3.sql` | ✅ |
| `income_streams` | `0024_income_streams.sql` | ✅ |
| RLS pe toate + helper `app.user_household_ids()` | `0002_rls.sql` | ✅ |
| `handle_new_user` trigger | `0003_triggers.sql:13` | ✅ |
| `fn_tx_balance` + `fn_tx_base_amount` | `0003_triggers.sql:60,116` | ✅ |
| `fx_at(_from, _to, _date)` cu pivot RON | `0004_functions.sql` | ✅ |
| `match_transactions` RPC pgvector | `0004_functions.sql` | ✅ |
| `cashflow(_hh, _from, _to)` RPC | `0004_functions.sql` | ✅ |
| `accept_invite(_token)` RPC | `0007_invites.sql` | ✅ |
| `budget_progress(_hh, _month)` RPC | `0012_budget_progress.sql` | ✅ |
| Auto-detect transfer trigger | `0010_transfer_detect.sql` | ✅ |
| IBAN encryption + Vault | `0005_iban_crypto.sql` | ✅ |

**Cron-uri pg_cron**: `fx-update-daily` (10:30 L-V), `weekly-recap-monday` (Mon 06:00),
`process-embeddings` (5min), `bank-sync-6h` (X:15 fiecare 6h),
`push-dispatch-daily` (07:00). Toate via `pg_net` Bearer din Vault.

## §7 Open Banking

| Capability | Fișier | Status |
|---|---|---|
| JWT RS256 cu jose | `src/lib/enable-banking/client.ts` | ✅ |
| 4 endpoints (`/auth`, `/sessions`, balances, transactions) | `src/lib/enable-banking/client.ts` | ✅ |
| Start-auth + callback flow | `src/app/api/banking/{start-auth,callback}/route.ts` | ✅ |
| Connections page cu status badges | `src/app/(dashboard)/connections/page.tsx` | ✅ |
| Cron 6h bank-sync edge function | `supabase/functions/bank-sync/index.ts` | ✅ |
| Reauth alerts (push <14 zile) | `supabase/functions/push-dispatch/index.ts` | ✅ |
| 6 CSV parsers (BT24/BCR/ING/Revolut/CEC/Raiffeisen) | `src/lib/banking/csv-parsers/*.ts` | ✅ |
| Merchant matcher 4-tier | `src/lib/banking/merchant-matcher.ts` | ✅ |
| Import wizard UI cu drag-drop | `src/components/features/import/import-wizard.tsx` | ✅ |

## §8 Feature spec — screens

| Screen / flow | Fișier | Status |
|---|---|---|
| Bottom tab bar floating + center FAB long-press | `src/components/features/dashboard/nav.tsx` | ✅ |
| Sidebar 240px desktop + Cmd-K | `src/components/features/dashboard/nav.tsx` + `src/components/features/ai-chat/command-palette.tsx` | ✅ |
| Dashboard hero (NetWorthHeadline cu sparkline) | `src/components/features/dashboard/net-worth-headline.tsx` | ✅ |
| 3 KPI cards (income/spent/saved) | `src/components/features/dashboard/kpi-row.tsx` + `kpi-card.tsx` | ✅ |
| Budget pulse bar cu „Mai ai X lei pentru Y zile" | `src/components/features/dashboard/budget-pulse-bar.tsx` | ✅ |
| Mini-Sankey (Nivo) | `src/components/features/dashboard/mini-sankey.tsx` | ✅ |
| Recent transactions card cu Review badges | `src/components/features/dashboard/recent-transactions.tsx` | ✅ |
| Upcoming bills (next 7 zile) | `src/components/features/dashboard/upcoming-bills.tsx` | ✅ |
| Goals progress rings cu gradient aurora | `src/components/features/dashboard/goals-progress.tsx` | ✅ |
| Calendar heatmap (12 weeks mobile / 365 desktop) | `src/components/features/dashboard/calendar-heatmap.tsx` | ✅ |
| RSC streaming + Suspense per widget | `src/app/(dashboard)/page.tsx` | ✅ |
| Transactions: day headers sticky, virtualizat (TanStack Virtual) | `src/components/features/transactions/transaction-list.tsx` | ✅ |
| Transaction row cu logo circle + tabular amount | `src/components/features/transactions/transaction-row.tsx` | ✅ |
| Swipe gestures (motion) | `transaction-row.tsx` cu `motion` drag | ✅ |
| Bulk actions floating | `bulk-action-bar.tsx` | ✅ |
| Splits modal | `split-modal.tsx` | ✅ |
| Filter chips cu URL state | `transaction-filters.tsx` | ✅ |
| Detail drawer + comments + emoji | `transaction-detail.tsx` | ✅ |
| Inline rule extraction (toast „Crează regulă") | `transaction-detail.tsx` + `createRuleFromCorrection` action | ✅ |
| Budgets target mode | `target-budget.tsx` | ✅ |
| Budgets envelope mode + Move money | `envelope-budget.tsx` + `move-money-sheet.tsx` | ✅ |
| Goals 5 bucket types | `goal-form.tsx` cu enum check | ✅ |
| Debt snowball + avalanche side-by-side | `debt-payoff.tsx` | ✅ |
| Quick-add custom keypad cu calculator row | `numeric-keypad.tsx` | ✅ |
| Pinned presets long-press delete | `preset-bar.tsx` | ✅ |
| Voice input Web Speech + Groq parse | `voice-input.tsx` + `api/ai/parse-voice` | ✅ |
| Receipt OCR GPT-4o vision | `receipt-capture.tsx` + `api/ai/parse-receipt` | ✅ |
| Account picker pill | `account-pill.tsx` | ✅ |
| Category grid (recent first + search Fuse.js) | `category-grid.tsx` | ✅ |
| AI chat dedicated `/ai` page cu useChat + tools | `ai/page.tsx` + `api/ai/chat/route.ts` | ✅ |
| 7 tool-uri (query_transactions, get_budget, simulate_scenario etc.) | `src/lib/ai/tools.ts` | ✅ |
| Cmd-K command palette | `command-palette.tsx` | ✅ |
| Settings 6 tabs (Membri, Notificări, Aspect, Profil, Linkuri, Export) | `settings/page.tsx` | ✅ |
| Login page magic-link | `(auth)/login/page.tsx` | ✅ |

## §9 RO-specific

| Feature | Fișier | Status |
|---|---|---|
| BNR daily fetch via cron + Frankfurter fallback | `supabase/functions/fx-update/index.ts` | ✅ |
| `parseBnrXml` cu multiplier normalize (HUF/JPY) | `src/lib/fx.ts` | ✅ |
| Backfill istoric `/api/fx/historical` | `src/app/api/fx/historical/route.ts` | ✅ |
| FX dashboard 12 luni | `src/components/features/insights/fx-dashboard.tsx` | ✅ |
| 25 categorii românești pre-seed | `src/db/migrations/0099_seed.sql` | ✅ |
| Diacritics (ș/ț comma-below, normalize) | `src/lib/text/diacritics.ts` | ✅ |
| Format ro-RO (1.234,56 lei DD.MM.YYYY luni first) | `src/lib/money.ts` + `formatMoney` | ✅ |
| Tichete masă account type + provider matcher | `src/lib/meal-vouchers/providers.ts` | ✅ |
| Tichete masă lots + 12-month expiry | `0022_meal_voucher_lots.sql` + `meal-voucher-card.tsx` | ✅ |
| Pilon III tracker 400 EUR/an | `0023_pension_pilon3.sql` + `/pension` page | ✅ |
| Salary intelligence (algoritm + countdown) | `src/lib/intelligence/salary-detection.ts` + `next-income-widget.tsx` | ✅ |
| Romanian holidays cu Computus pentru Paștele ortodox | `src/lib/holidays/ro.ts` | ✅ |
| Seasonal sub-budgets (Crăciun/Paște/BF/Mărțișor/vacanță) cu auto-prompt 1 lună înainte | `src/lib/seasonal/budgets.ts` + `seasonal-prompt.tsx` | ✅ |
| Cashflow forecast 30/60/90 cu confidence band ±15% | `src/lib/forecast/cashflow.ts` + `cashflow-forecast-widget.tsx` | ✅ |
| Rage spending detector (≥3 tx <30min) | `src/lib/intelligence/rage-spending.ts` | ✅ |
| Lifestyle inflation 12-month YoY | `src/lib/intelligence/lifestyle-inflation.ts` | ✅ |
| Spending anniversaries („acum un an X la Y") | `src/lib/intelligence/anniversaries.ts` + `anniversaries-widget.tsx` | ✅ |
| Anomaly detection statistical baseline + LLM phrasing | `src/lib/ai/anomaly.ts` | ✅ |
| Subscription detection median-gap + price-hike | `src/lib/ai/subscriptions.ts` + `/subscriptions` page | ✅ |
| Weekly recap luni 06:00 UTC + push | `supabase/functions/weekly-recap/index.ts` | ✅ |

## §10 Multi-currency

| Cerință | Implementare | Status |
|---|---|---|
| BIGINT minor units | Schema toate amount-urile | ✅ |
| Triplet (amount, original_amount, base_amount) | `transactions` table | ✅ |
| BNR pipeline + Frankfurter fallback | Edge function + cron | ✅ |
| `fx_at` cross-rate prin RON pivot | `0004_functions.sql` | ✅ |
| Dinero.js v2 wrapper | `src/lib/money.ts` | ✅ |
| `<CurrencyInput>` cu inputMode decimal ro-RO | `src/components/ui/currency-input.tsx` | ✅ |

## §11 MVP — toate bullet-urile

Fiecare punct din §11 e bifat mai sus. Două gap-uri minore identificate
și reparate în acest commit:

1. **Pre-seeded rules pentru top 20 merchanți români** — aveam doar
   `merchant-matcher.ts` (Tier 1-4) care rulează la import CSV. Pentru
   tranzacții manuale și bank-sync, e nevoie de rule-uri SQL în tabela
   `rules`. Fixate în `0025_seed_rules.sql`.

2. **Approve-workflow ownership pentru tranzacții shared** — avem
   coloana `ownership` și `setOwnership` action. Adăugat un quick
   action în `transaction-detail.tsx` care permite swipe între
   mine/yours/shared cu un singur tap.

## V2 — features rămase pentru luna 3-4

Conform BLUEPRINT §11.V2, NU sunt în MVP:
- Bill prediction cu linear regression (avem cashflow forecast simplu)
- FIRE / Coast FIRE projection
- Receipt line-item splitting
- Geo-tagged spending heatmap pe hartă
- Smart round-ups
- Passkey login (SimpleWebAuthn)
- Export PDF (avem CSV + JSON)

## V3+

- MCP server pentru Claude Desktop
- Investment portfolio cu TWR/IRR
- ANAF Form 230 export
- Day-of-week heatmap
- Quarterly money-personality LLM report

## Concluzie

**MVP din BLUEPRINT §11 e implementat 100%.** Codebase-ul are 18 migrații
SQL, 19 pagini Next.js, 11 server actions, 5 edge functions, 80+
feature components. Liquid Glass design system aplicat universal.

**Pentru deploy production**: vezi `EXTERN_CHECKLIST.md` (env vars
Vercel + Supabase Vault + extensions + edge functions deploy).
