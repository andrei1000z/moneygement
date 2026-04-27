-- =====================================================================
-- 0024_income_streams.sql — surse de venit recurente (salariu, pensie etc).
--
-- Detectate automat din istoricul de tranzacții (≥3 ocurențe stabile)
-- sau adăugate manual. Folosite la cashflow forecast și widget countdown.
-- =====================================================================

create table if not exists public.income_streams (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  payer text,
  expected_amount bigint not null,            -- minor units, baseline mediană
  expected_currency char(3) not null default 'RON',
  expected_day_of_month integer,              -- 1..31
  cadence_days integer not null default 30,
  day_variance integer not null default 2,    -- ±N zile toleranță
  confidence numeric(3,2) not null default 0.5,
  is_active boolean not null default true,
  source text not null default 'auto'
    check (source in ('auto','manual')),
  last_seen_on date,
  next_expected_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_income_streams_updated_at
  before update on public.income_streams
  for each row execute function app.set_updated_at();

create index if not exists income_streams_user_active_idx
  on public.income_streams (user_id, is_active);

alter table public.income_streams enable row level security;

drop policy if exists "income_streams_select_member"
  on public.income_streams;
create policy "income_streams_select_member" on public.income_streams
  for select using (household_id in (select app.user_household_ids()));

drop policy if exists "income_streams_member_write"
  on public.income_streams;
create policy "income_streams_member_write" on public.income_streams
  for all using (household_id in (select app.user_household_ids()))
  with check (household_id in (select app.user_household_ids()));

comment on table public.income_streams is
  'Surse de venit recurente — salariu, pensie, freelance — detectate automat sau manuale.';
