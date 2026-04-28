-- =====================================================================
-- 0028_trips.sql — Travel mode (BLUEPRINT §10).
--
-- Tag-based clustering: la creare trip, toate tranzacțiile din interval
-- primesc tag-ul (`trip_grecia_2026`). Anomaly detector ignoră tx-uri
-- cu tag care începe cu `trip_`. Cheltuielile pe trip se vizualizează
-- pe pagina /trips cu breakdown categorii și progres bar față de buget.
-- =====================================================================

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  country_code char(2),
  started_on date not null,
  ended_on date,
  base_currency char(3) not null default 'RON',
  budget_minor bigint,
  envelope_goal_id uuid references public.goals(id) on delete set null,
  tag text not null,
  detected_automatically boolean default true,
  archived_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists trips_household_idx
  on public.trips (household_id, started_on desc);

create unique index if not exists trips_household_tag_unique_idx
  on public.trips (household_id, tag);

alter table public.trips enable row level security;

drop policy if exists "trips_select" on public.trips;
create policy "trips_select" on public.trips
  for select using (household_id in (select app.user_household_ids()));

drop policy if exists "trips_insert" on public.trips;
create policy "trips_insert" on public.trips
  for insert with check (household_id in (select app.user_household_ids()));

drop policy if exists "trips_update" on public.trips;
create policy "trips_update" on public.trips
  for update using (household_id in (select app.user_household_ids()));

drop policy if exists "trips_delete" on public.trips;
create policy "trips_delete" on public.trips
  for delete using (household_id in (select app.user_household_ids()));

-- Auto-tag trigger: când o tranzacție nouă pică în range-ul unui trip
-- activ, taggează-o automat.
create or replace function public.fn_auto_tag_trip()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_trip_tag text;
begin
  -- Caută orice trip al household-ului care acoperă data tranzacției.
  select tag into v_trip_tag
    from public.trips
   where household_id = new.household_id
     and started_on <= new.occurred_on
     and (ended_on is null or ended_on >= new.occurred_on)
     and archived_at is null
   limit 1;

  if v_trip_tag is not null then
    -- Adaugă tag-ul fără duplicate.
    if not (new.tags @> array[v_trip_tag]) then
      new.tags := array_append(coalesce(new.tags, '{}'::text[]), v_trip_tag);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auto_tag_trip on public.transactions;
create trigger trg_auto_tag_trip
  before insert on public.transactions
  for each row execute function public.fn_auto_tag_trip();

comment on table public.trips is
  'Călătorii: cluster tranzacții taggate (trip_*). Bugete envelope-style.';
