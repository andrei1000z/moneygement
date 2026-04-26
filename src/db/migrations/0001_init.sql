-- =====================================================================
-- 0001_init.sql — schema initial
-- Sursă: BLUEPRINT.md §6 + completări (indici, helper schema `app`).
-- Rulează pe Supabase fresh (Postgres 16). Run order:
--   0001 → 0002 → 0003 → 0004 → 0099
-- =====================================================================

-- ---------- Extensii ------------------------------------------------------
create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists pg_trgm;
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- ---------- Schema utilitar pentru helpere RLS ---------------------------
create schema if not exists app;
grant usage on schema app to authenticated, service_role;

-- ---------- Trigger generic pentru updated_at ----------------------------
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- Households + members -----------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_currency char(3) not null default 'RON',
  locale text not null default 'ro-RO',
  timezone text not null default 'Europe/Bucharest',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_households_updated_at
  before update on public.households
  for each row execute function app.set_updated_at();

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member','viewer')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user_idx on public.household_members (user_id);

-- ---------- Profiles -----------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  default_currency char(3) default 'RON',
  language text default 'ro',
  active_household uuid references public.households(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function app.set_updated_at();

-- ---------- Accounts -----------------------------------------------------
create type public.account_type as enum (
  'checking','savings','credit_card','cash','investment','loan','wallet','meal_voucher'
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  type public.account_type not null,
  currency char(3) not null,
  bank_name text,
  iban_last4 text,
  iban_encrypted bytea,
  initial_balance bigint not null default 0,
  current_balance bigint not null default 0,
  is_shared boolean not null default true,
  is_active boolean not null default true,
  color text,
  icon text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_household_idx on public.accounts (household_id);
create trigger trg_accounts_updated_at
  before update on public.accounts
  for each row execute function app.set_updated_at();

-- ---------- Categories ---------------------------------------------------
create type public.category_type as enum ('income','expense','transfer');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  type public.category_type not null,
  icon text,
  color text,
  budget_amount bigint,
  is_system boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (household_id, parent_id, name)
);

create index categories_household_idx on public.categories (household_id);

-- ---------- Merchants ----------------------------------------------------
create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  normalized_name text generated always as
    (lower(regexp_replace(name, '[^a-z0-9]+', '', 'gi'))) stored,
  logo_url text,
  default_category_id uuid references public.categories(id) on delete set null,
  website text,
  created_at timestamptz not null default now()
);

create index merchants_household_idx on public.merchants (household_id);
create index merchants_normalized_name_trgm_idx
  on public.merchants using gin (normalized_name gin_trgm_ops);

-- ---------- Transactions (inima) -----------------------------------------
create type public.tx_status as enum ('cleared','pending','scheduled','void');
create type public.tx_source as enum ('manual','import','bank_sync','recurring','transfer');

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  occurred_on date not null,
  posted_at timestamptz,
  amount bigint not null,                          -- signed minor units, account currency
  currency char(3) not null,
  original_amount bigint,
  original_currency char(3),
  exchange_rate numeric(18,8),
  base_amount bigint,                              -- household.base_currency, set by trigger
  payee text,
  merchant_id uuid references public.merchants(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  notes text,
  tags text[] not null default '{}',
  status public.tx_status not null default 'cleared',
  source public.tx_source not null default 'manual',
  external_id text,
  bank_connection_id uuid,                         -- FK adăugat după ce există bank_connections
  is_transfer boolean not null default false,
  transfer_pair_id uuid references public.transactions(id) on delete set null,
  receipt_url text,
  location jsonb,
  ownership text not null default 'mine'
    check (ownership in ('mine','yours','shared')),
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, external_id)
);

create index tx_household_date_idx
  on public.transactions (household_id, occurred_on desc, id desc);
create index tx_account_date_idx
  on public.transactions (account_id, occurred_on desc, id desc);
create index tx_category_date_idx
  on public.transactions (household_id, category_id, occurred_on desc);
create index tx_payee_trgm_idx
  on public.transactions using gin (payee gin_trgm_ops);
create index tx_tags_idx
  on public.transactions using gin (tags);
create index tx_embedding_idx
  on public.transactions using hnsw (embedding vector_cosine_ops);

create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function app.set_updated_at();

-- ---------- Budgets ------------------------------------------------------
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  month date not null,
  amount bigint not null,
  rollover boolean not null default false,
  created_at timestamptz not null default now(),
  unique (household_id, category_id, month),
  check (extract(day from month) = 1)
);

create index budgets_household_month_idx on public.budgets (household_id, month);

-- ---------- Goals --------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  target_amount bigint not null,
  current_amount bigint not null default 0,
  currency char(3) not null default 'RON',
  target_date date,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  bucket_type text not null default 'goal'
    check (bucket_type in ('standard','goal','monthly','goal_monthly','debt')),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index goals_household_idx on public.goals (household_id);

-- ---------- Recurring transactions ---------------------------------------
create type public.recurrence_freq as enum
  ('daily','weekly','biweekly','monthly','quarterly','yearly');

create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  payee text,
  amount bigint not null,
  currency char(3) not null,
  frequency public.recurrence_freq not null,
  interval int not null default 1,
  start_date date not null,
  end_date date,
  next_date date not null,
  last_run_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index recurring_household_next_idx
  on public.recurring_transactions (household_id, next_date)
  where is_active = true;

-- ---------- Rules --------------------------------------------------------
create table public.rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  priority int not null default 100,
  is_active boolean not null default true,
  match_payee_regex text,
  match_account_id uuid references public.accounts(id) on delete cascade,
  match_min_amount bigint,
  match_max_amount bigint,
  match_currency char(3),
  set_category_id uuid references public.categories(id) on delete set null,
  add_tags text[] not null default '{}',
  set_notes text,
  created_at timestamptz not null default now()
);

create index rules_household_priority_idx
  on public.rules (household_id, priority)
  where is_active = true;

-- ---------- Exchange rates -----------------------------------------------
create table public.exchange_rates (
  rate_date date not null,
  base char(3) not null,
  quote char(3) not null,
  rate numeric(18,8) not null,
  source text not null default 'BNR',
  inserted_at timestamptz not null default now(),
  primary key (rate_date, base, quote)
);

create index exchange_rates_pair_date_idx
  on public.exchange_rates (base, quote, rate_date desc);

-- ---------- Bank connections ---------------------------------------------
create type public.bank_conn_status as enum
  ('pending','active','expired','error','revoked');

create table public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'enable_banking',
  institution_id text not null,
  institution_name text,
  requisition_id text unique,
  status public.bank_conn_status not null default 'pending',
  expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

create index bank_connections_household_idx
  on public.bank_connections (household_id);

-- Acum că bank_connections există, atașăm FK-ul amânat de pe transactions.
alter table public.transactions
  add constraint transactions_bank_connection_fk
  foreign key (bank_connection_id)
  references public.bank_connections(id)
  on delete set null;

-- ---------- Attachments --------------------------------------------------
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index attachments_transaction_idx
  on public.attachments (transaction_id);

-- ---------- Transaction comments -----------------------------------------
create table public.tx_comments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  emoji text,
  created_at timestamptz not null default now()
);

create index tx_comments_transaction_idx
  on public.tx_comments (transaction_id, created_at desc);

-- ---------- Push subscriptions -------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx
  on public.push_subscriptions (user_id);
