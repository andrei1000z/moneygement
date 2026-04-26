# Migrații Banii

Migrațiile sunt scrise pentru Postgres 16 (Supabase). Le rulezi în ordine numerică:

```
0001_init.sql       → schema (extensii, tabele, indici, enums)
0002_rls.sql        → row level security + helper app.user_household_ids()
0003_triggers.sql   → handle_new_user, fn_tx_balance, fn_tx_base_amount
0004_functions.sql  → fx_at, match_transactions, cashflow (RPC)
0099_seed.sql       → trigger seed pentru categorii românești default
```

## Cum aplici contra unui proiect Supabase

Migrațiile trăiesc canonic în `src/db/migrations/`. Supabase CLI recunoaște `supabase/migrations/` — folosește un mic copy-step ca să le păstrezi sincronizate.

```bash
# 1. Setup unic
npx supabase init                              # creează supabase/
mkdir -p supabase/migrations
cp src/db/migrations/0001_init.sql supabase/migrations/20260101000001_init.sql
cp src/db/migrations/0002_rls.sql  supabase/migrations/20260101000002_rls.sql
cp src/db/migrations/0003_triggers.sql supabase/migrations/20260101000003_triggers.sql
cp src/db/migrations/0004_functions.sql supabase/migrations/20260101000004_functions.sql
cp src/db/migrations/0099_seed.sql  supabase/migrations/20260101000099_seed.sql

# 2. Local (necesită Docker Desktop)
npx supabase start
npx supabase db reset       # aplică migrațiile pe local-ul fresh
npx supabase gen types typescript --local > src/types/database.ts

# 3. Remote
npx supabase link --project-ref <project-ref>
npx supabase db push        # trimite migrațiile pe remote
npx supabase gen types typescript --linked > src/types/database.ts
```

## Verificarea sintactică offline

Migrațiile se parsează cu `pg-query-emscripten` (libpg_query WASM). La momentul scrierii (Faza 1) toate cele 5 fișiere parsează clean — 122 statements + 11 blocuri plpgsql.

## Pattern-uri de respectat

- **Niciodată** nu adăuga policy-uri care lasă `using (true)` pe tabele cu `household_id`. Folosește `app.user_household_ids()`.
- **Niciodată** nu inserezi categorii direct — `seed_default_categories`rulează automat la INSERT pe `households`.
- **Niciodată** nu setezi `base_amount` manual din aplicație. `fn_tx_base_amount` se ocupă (BEFORE INSERT/UPDATE).
- Adaugă cron jobs noi cu `cron.schedule(...)` într-o migrație separată (ex.: `0010_cron.sql`), nu modifica fișierele existente.
- Generează un nou fișier numerotat pentru orice schemă nouă — nu rescrie migrațiile aplicate deja.
