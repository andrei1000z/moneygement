-- =====================================================================
-- 0022_meal_voucher_lots.sql — loturi tichete masă cu expiry tracking.
--
-- Fiecare top-up creează un lot cu data și suma. Suma se consumă FIFO
-- (cele mai vechi se cheltuiesc întâi). Expirarea: 12 luni de la
-- creditare (Edenred / Pluxee / Up România standard 2026).
-- =====================================================================

create table if not exists public.meal_voucher_lots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  provider text,
  top_up_date date not null,
  amount bigint not null,             -- minor units, suma originală creditată
  remaining bigint not null,          -- minor units rămași (FIFO consumption)
  expires_on date not null,           -- top_up_date + 12 luni
  source_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_mvl_updated_at
  before update on public.meal_voucher_lots
  for each row execute function app.set_updated_at();

create index if not exists meal_voucher_lots_account_idx
  on public.meal_voucher_lots (account_id, expires_on);
create index if not exists meal_voucher_lots_remaining_idx
  on public.meal_voucher_lots (account_id)
  where remaining > 0;

alter table public.meal_voucher_lots enable row level security;

drop policy if exists "mvl_select_member" on public.meal_voucher_lots;
create policy "mvl_select_member" on public.meal_voucher_lots
  for select using (household_id = any(app.user_household_ids()));

drop policy if exists "mvl_member_write" on public.meal_voucher_lots;
create policy "mvl_member_write" on public.meal_voucher_lots
  for all using (household_id = any(app.user_household_ids()))
  with check (household_id = any(app.user_household_ids()));

comment on table public.meal_voucher_lots is
  'Loturi tichete masă cu expiry tracking; FIFO consumption pe `remaining`.';
