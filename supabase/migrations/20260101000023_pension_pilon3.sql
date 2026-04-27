-- =====================================================================
-- 0023_pension_pilon3.sql — Pilon III deductible tracker.
--
-- Plafon deductibil 400 EUR/an conform Codul Fiscal art. 86. Stocăm
-- amount_eur ca numeric (sumă oficială pentru ANAF) și amount_ron
-- bigint (la curs BNR la data contribuției) pentru referință.
-- =====================================================================

create table if not exists public.pension_contributions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text,
  contribution_date date not null,
  amount_eur numeric(12,2) not null,
  amount_ron bigint,
  deductible boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

-- Generated column pentru an — query-urile sunt mereu pe an fiscal.
alter table public.pension_contributions
  add column if not exists year integer
  generated always as (extract(year from contribution_date)::integer) stored;

create index if not exists pension_contributions_user_year_idx
  on public.pension_contributions (user_id, year);

alter table public.pension_contributions enable row level security;

drop policy if exists "pension_select_own" on public.pension_contributions;
create policy "pension_select_own" on public.pension_contributions
  for select using (user_id = auth.uid());

drop policy if exists "pension_insert_own" on public.pension_contributions;
create policy "pension_insert_own" on public.pension_contributions
  for insert with check (user_id = auth.uid());

drop policy if exists "pension_update_own" on public.pension_contributions;
create policy "pension_update_own" on public.pension_contributions
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "pension_delete_own" on public.pension_contributions;
create policy "pension_delete_own" on public.pension_contributions
  for delete using (user_id = auth.uid());

comment on table public.pension_contributions is
  'Contribuții Pilon III (deductibile 400 EUR/an pentru salariați conform CF art. 86).';
