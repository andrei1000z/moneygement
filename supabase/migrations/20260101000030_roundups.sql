-- =====================================================================
-- 0030_roundups.sql — Smart round-ups (BLUEPRINT V2).
--
-- Pentru fiecare expense manual (ne-bank_sync, ne-transfer), calculăm
-- diferența până la următoarea unitate (1 leu = 100 bani) și o adăugăm
-- la goal-ul activ pentru rotunjiri.
-- =====================================================================

alter table public.households
  add column if not exists roundup_goal_id uuid references public.goals(id) on delete set null,
  add column if not exists roundup_active boolean default false;

create or replace function public.fn_apply_roundup()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_household record;
  v_diff bigint;
begin
  -- Doar pe expense manuale, nu transfer, nu bank_sync.
  if new.amount >= 0 then return new; end if;
  if new.is_transfer then return new; end if;
  if new.source = 'bank_sync' then return new; end if;

  select roundup_goal_id, roundup_active
    into v_household
    from public.households
   where id = new.household_id;

  if not v_household.roundup_active or v_household.roundup_goal_id is null then
    return new;
  end if;

  -- diff: cât e până la următoarea unitate (1 leu = 100 bani).
  v_diff := 100 - (abs(new.amount) % 100);
  if v_diff = 100 or v_diff = 0 then return new; end if;

  update public.goals
     set current_amount = current_amount + v_diff
   where id = v_household.roundup_goal_id;

  return new;
end;
$$;

drop trigger if exists trg_apply_roundup on public.transactions;
create trigger trg_apply_roundup
  after insert on public.transactions
  for each row execute function public.fn_apply_roundup();

comment on column public.households.roundup_goal_id is
  'Goal-ul către care merg rotunjirile (smart round-ups). Dacă null, dezactivat.';
