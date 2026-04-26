-- =====================================================================
-- 0011_presets.sql — pinned quick-add presets + receipts storage bucket.
-- =====================================================================

-- ---------- quick_add_presets --------------------------------------------
create table if not exists public.quick_add_presets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  label text not null,
  emoji text,
  amount bigint not null,
  currency char(3) not null default 'RON',
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists quick_add_presets_household_idx
  on public.quick_add_presets (household_id, position);

alter table public.quick_add_presets enable row level security;

create policy "presets_household_all" on public.quick_add_presets
  for all to authenticated
  using (household_id in (select app.user_household_ids()))
  with check (household_id in (select app.user_household_ids()));

-- ---------- Seed implicit la creare household ----------------------------
create or replace function public.seed_default_presets(_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.quick_add_presets
    (household_id, label, emoji, amount, currency, position)
  values
    (_household_id, 'Cafea',       '☕', 1200,  'RON', 0),
    (_household_id, 'Prânz',       '🍔', 3500,  'RON', 1),
    (_household_id, 'Transport',   '🚌',  500,  'RON', 2),
    (_household_id, 'Combustibil', '⛽', 20000, 'RON', 3),
    (_household_id, 'Lidl',        '🛒', 10000, 'RON', 4)
  on conflict do nothing;
end;
$$;

create or replace function public.fn_seed_default_presets()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.seed_default_presets(new.id);
  return new;
end;
$$;

drop trigger if exists trg_seed_default_presets on public.households;
create trigger trg_seed_default_presets
  after insert on public.households
  for each row execute function public.fn_seed_default_presets();

-- Back-fill pentru householdurile existente (idempotent prin verificare).
do $$
declare
  hh record;
  has_any int;
begin
  for hh in select id from public.households loop
    select count(*) into has_any
      from public.quick_add_presets
     where household_id = hh.id;
    if has_any = 0 then
      perform public.seed_default_presets(hh.id);
    end if;
  end loop;
end;
$$;

-- ---------- Storage bucket pentru bonuri scanate -------------------------
-- Bucket privat. RLS pe storage.objects permite acces doar membrilor
-- household-ului care încarcă/citește. Folder pattern: <household_id>/<file>.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Citire: folder-ul e household_id, deci primul segment al `name`.
create policy "receipts_select_member" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1]::uuid in (select app.user_household_ids())
  );

create policy "receipts_insert_member" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1]::uuid in (select app.user_household_ids())
  );

create policy "receipts_update_member" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1]::uuid in (select app.user_household_ids())
  );

create policy "receipts_delete_member" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1]::uuid in (select app.user_household_ids())
  );
