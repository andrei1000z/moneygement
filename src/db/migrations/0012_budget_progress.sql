-- =====================================================================
-- 0012_budget_progress.sql — RPC pentru progresul bugetelor.
--
-- Returnează pentru fiecare categorie cu buget setat în luna `_month`:
-- bugetat, cheltuit, available, plus rollover-ul din luna anterioară.
-- =====================================================================

create or replace function public.budget_progress(
  _hh    uuid,
  _month date
)
returns table (
  category_id   uuid,
  budget_amount bigint,
  rollover      boolean,
  spent         bigint,
  rollover_in   bigint,
  available     bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with
    -- Normalizează la prima zi a lunii.
    me as (select date_trunc('month', _month)::date as ms),
    prev as (select (date_trunc('month', _month) - interval '1 month')::date as ms),
    month_end as (
      select (date_trunc('month', _month) + interval '1 month - 1 day')::date as me
    ),

    -- Bugete pentru luna curentă.
    cur_budgets as (
      select b.category_id, b.amount as budget_amount, b.rollover
        from public.budgets b
       where b.household_id = _hh
         and b.month = (select ms from me)
    ),

    -- Cheltuieli pe luna curentă (excludem transferurile + tx void).
    cur_spending as (
      select t.category_id,
             sum(case when t.amount < 0 then -t.amount else 0 end)::bigint as spent
        from public.transactions t
       where t.household_id = _hh
         and t.is_transfer = false
         and t.status in ('cleared'::public.tx_status, 'pending'::public.tx_status)
         and t.occurred_on between (select ms from me)
                              and (select me from month_end)
       group by t.category_id
    ),

    -- Bugete pe luna anterioară (pentru carry-over).
    prev_budgets as (
      select b.category_id, b.amount as budget_amount, b.rollover
        from public.budgets b
       where b.household_id = _hh
         and b.month = (select ms from prev)
    ),

    prev_spending as (
      select t.category_id,
             sum(case when t.amount < 0 then -t.amount else 0 end)::bigint as spent
        from public.transactions t
       where t.household_id = _hh
         and t.is_transfer = false
         and t.status in ('cleared'::public.tx_status, 'pending'::public.tx_status)
         and t.occurred_on between (select ms from prev)
                              and ((select ms from me) - 1)
       group by t.category_id
    ),

    rollover_in as (
      select pb.category_id,
             greatest(0, pb.budget_amount - coalesce(ps.spent, 0))::bigint as carry
        from prev_budgets pb
        left join prev_spending ps on ps.category_id = pb.category_id
       where pb.rollover = true
    )

  select
    cb.category_id,
    cb.budget_amount,
    cb.rollover,
    coalesce(cs.spent, 0)::bigint as spent,
    coalesce(ri.carry, 0)::bigint as rollover_in,
    (cb.budget_amount + coalesce(ri.carry, 0) - coalesce(cs.spent, 0))::bigint
      as available
  from cur_budgets cb
  left join cur_spending cs on cs.category_id = cb.category_id
  left join rollover_in ri on ri.category_id = cb.category_id
  where cb.category_id is not null;
$$;

grant execute on function public.budget_progress(uuid, date) to authenticated;

-- =====================================================================
-- Income for a month — pentru Ready to Assign în envelope mode.
-- =====================================================================
create or replace function public.month_income(
  _hh    uuid,
  _month date
)
returns bigint
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with me as (select date_trunc('month', _month)::date as ms),
       month_end as (
         select (date_trunc('month', _month) + interval '1 month - 1 day')::date as me
       )
  select coalesce(
    sum(case when t.amount > 0 then t.amount else 0 end),
    0
  )::bigint
  from public.transactions t, me, month_end
  where t.household_id = _hh
    and t.is_transfer = false
    and t.status in ('cleared'::public.tx_status, 'pending'::public.tx_status)
    and t.occurred_on between me.ms and month_end.me;
$$;

grant execute on function public.month_income(uuid, date) to authenticated;
