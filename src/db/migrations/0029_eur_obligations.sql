-- =====================================================================
-- 0029_eur_obligations.sql — EUR rent / obligații recurente (BLUEPRINT §10).
--
-- Tracking pentru obligații denominate în EUR (chirie, asigurare, etc.)
-- + view care arată impactul FX (BNR) pe ultimele 12 luni.
-- =====================================================================

create table if not exists public.eur_obligations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  label text not null,
  amount_eur bigint not null,                    -- minor units EUR (350 EUR = 35000 cents)
  day_of_month integer not null check (day_of_month between 1 and 31),
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  is_active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists eur_obligations_household_idx
  on public.eur_obligations (household_id);

create trigger trg_eur_obligations_updated_at
  before update on public.eur_obligations
  for each row execute function app.set_updated_at();

alter table public.eur_obligations enable row level security;

drop policy if exists "eur_obl_select" on public.eur_obligations;
create policy "eur_obl_select" on public.eur_obligations
  for select using (household_id in (select app.user_household_ids()));

drop policy if exists "eur_obl_insert" on public.eur_obligations;
create policy "eur_obl_insert" on public.eur_obligations
  for insert with check (household_id in (select app.user_household_ids()));

drop policy if exists "eur_obl_update" on public.eur_obligations;
create policy "eur_obl_update" on public.eur_obligations
  for update using (household_id in (select app.user_household_ids()));

drop policy if exists "eur_obl_delete" on public.eur_obligations;
create policy "eur_obl_delete" on public.eur_obligations
  for delete using (household_id in (select app.user_household_ids()));

-- Vedere care arată impactul FX pe ultimele 12 luni: pentru fiecare
-- obligație activă × fiecare zi cu rate EUR→RON, calculează echivalent RON.
create or replace view public.eur_obligations_fx_history as
  select
    o.id,
    o.household_id,
    o.label,
    o.amount_eur,
    er.rate_date,
    er.rate as eur_to_ron,
    (o.amount_eur::numeric * er.rate / 100)::bigint as estimated_ron_minor
  from public.eur_obligations o
  cross join lateral (
    select rate_date, rate
      from public.exchange_rates
     where base = 'EUR' and quote = 'RON'
       and rate_date >= now() - interval '12 months'
     order by rate_date asc
  ) er
  where o.is_active = true;

comment on table public.eur_obligations is
  'Obligații recurente denominate în EUR (chirie, asigurări). Cheltuiți RON la cursul BNR zilei plății.';
comment on view public.eur_obligations_fx_history is
  'Impact FX pe ultimele 12 luni: cât ai fi plătit în RON la cursul BNR zilnic.';
