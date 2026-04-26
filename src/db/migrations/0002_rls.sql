-- =====================================================================
-- 0002_rls.sql — Row Level Security pe TOATE tabelele publice.
-- Helper-ul `app.user_household_ids()` este unic-source-of-truth pentru
-- membership. Toate policy-urile authenticated trec prin el.
-- =====================================================================

-- ---------- Helper: household-urile user-ului curent ---------------------
create or replace function app.user_household_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select household_id
  from public.household_members
  where user_id = auth.uid();
$$;

revoke all on function app.user_household_ids() from public;
grant execute on function app.user_household_ids() to authenticated;

-- ---------- Activare RLS -------------------------------------------------
alter table public.households            enable row level security;
alter table public.household_members     enable row level security;
alter table public.profiles              enable row level security;
alter table public.accounts              enable row level security;
alter table public.categories            enable row level security;
alter table public.merchants             enable row level security;
alter table public.transactions          enable row level security;
alter table public.budgets               enable row level security;
alter table public.goals                 enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.rules                 enable row level security;
alter table public.exchange_rates        enable row level security;
alter table public.bank_connections      enable row level security;
alter table public.attachments           enable row level security;
alter table public.tx_comments           enable row level security;
alter table public.push_subscriptions    enable row level security;

-- ---------- households ---------------------------------------------------
-- Membrii văd household-urile lor; insert-ul de bază este făcut de
-- handle_new_user (security-definer), deci policy-ul de INSERT pentru user
-- direct rămâne `with check (true)` (oricum nu va fi membru până nu există
-- rândul în household_members).
create policy "households_select_members" on public.households
  for select to authenticated
  using (id in (select app.user_household_ids()));

create policy "households_update_members" on public.households
  for update to authenticated
  using (id in (select app.user_household_ids()))
  with check (id in (select app.user_household_ids()));

create policy "households_insert_authenticated" on public.households
  for insert to authenticated
  with check (true);

create policy "households_delete_owner" on public.households
  for delete to authenticated
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = households.id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

-- ---------- household_members --------------------------------------------
create policy "household_members_select_members" on public.household_members
  for select to authenticated
  using (household_id in (select app.user_household_ids()));

create policy "household_members_insert_owner_or_self" on public.household_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('owner','admin')
    )
  );

create policy "household_members_update_owner" on public.household_members
  for update to authenticated
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

create policy "household_members_delete_owner_or_self" on public.household_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

-- ---------- profiles -----------------------------------------------------
create policy "profiles_self_select" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_self_upsert" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_self_update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- profiles are deletate cascade din auth.users — fără policy de DELETE.

-- ---------- accounts -----------------------------------------------------
create policy "accounts_household_all" on public.accounts
  for all to authenticated
  using (household_id in (select app.user_household_ids()))
  with check (household_id in (select app.user_household_ids()));

-- ---------- categories ---------------------------------------------------
create policy "categories_household_all" on public.categories
  for all to authenticated
  using (household_id in (select app.user_household_ids()))
  with check (household_id in (select app.user_household_ids()));

-- ---------- merchants ----------------------------------------------------
create policy "merchants_household_all" on public.merchants
  for all to authenticated
  using (household_id in (select app.user_household_ids()))
  with check (household_id in (select app.user_household_ids()));

-- ---------- transactions -------------------------------------------------
create policy "transactions_household_all" on public.transactions
  for all to authenticated
  using (household_id in (select app.user_household_ids()))
  with check (household_id in (select app.user_household_ids()));

-- ---------- budgets ------------------------------------------------------
create policy "budgets_household_all" on public.budgets
  for all to authenticated
  using (household_id in (select app.user_household_ids()))
  with check (household_id in (select app.user_household_ids()));

-- ---------- goals --------------------------------------------------------
create policy "goals_household_all" on public.goals
  for all to authenticated
  using (household_id in (select app.user_household_ids()))
  with check (household_id in (select app.user_household_ids()));

-- ---------- recurring_transactions ---------------------------------------
create policy "recurring_household_all" on public.recurring_transactions
  for all to authenticated
  using (household_id in (select app.user_household_ids()))
  with check (household_id in (select app.user_household_ids()));

-- ---------- rules --------------------------------------------------------
create policy "rules_household_all" on public.rules
  for all to authenticated
  using (household_id in (select app.user_household_ids()))
  with check (household_id in (select app.user_household_ids()));

-- ---------- exchange_rates -----------------------------------------------
-- Citiți de oricine autenticat; scrise doar de cron jobs (service_role).
create policy "exchange_rates_select_authenticated" on public.exchange_rates
  for select to authenticated
  using (true);

-- ---------- bank_connections ---------------------------------------------
create policy "bank_connections_household_all" on public.bank_connections
  for all to authenticated
  using (household_id in (select app.user_household_ids()))
  with check (household_id in (select app.user_household_ids()));

-- ---------- attachments --------------------------------------------------
create policy "attachments_household_all" on public.attachments
  for all to authenticated
  using (household_id in (select app.user_household_ids()))
  with check (household_id in (select app.user_household_ids()));

-- ---------- tx_comments --------------------------------------------------
-- Comentariul moștenește household-ul prin transaction_id.
create policy "tx_comments_household_select" on public.tx_comments
  for select to authenticated
  using (
    exists (
      select 1 from public.transactions t
      where t.id = tx_comments.transaction_id
        and t.household_id in (select app.user_household_ids())
    )
  );

create policy "tx_comments_self_insert" on public.tx_comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.transactions t
      where t.id = tx_comments.transaction_id
        and t.household_id in (select app.user_household_ids())
    )
  );

create policy "tx_comments_self_update" on public.tx_comments
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "tx_comments_self_delete" on public.tx_comments
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------- push_subscriptions -------------------------------------------
create policy "push_subscriptions_self_all" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
