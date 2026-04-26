-- =====================================================================
-- 0004_functions.sql — funcții RPC publice.
--
--   * fx_at(_from, _to, _date)        — cross-rate prin pivot RON.
--   * match_transactions(...)         — semantic search via pgvector.
--   * cashflow(_hh, _from, _to)       — rollup lunar income/expense/net.
-- =====================================================================

-- ---------- fx_at --------------------------------------------------------
-- Returnează cursul "1 _from = X _to" la data `_date` (sau cea mai recentă
-- zi lucrătoare ≤ `_date`). Strategie: directă → inversă → pivot RON.
create or replace function public.fx_at(
  _from char(3),
  _to   char(3),
  _date date
)
returns numeric
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_rate         numeric(18,8);
  v_from_to_ron  numeric(18,8);
  v_ron_to_to    numeric(18,8);
begin
  if _from = _to then
    return 1.0;
  end if;

  -- 1) directă
  select rate into v_rate
    from public.exchange_rates
   where base = _from and quote = _to
     and rate_date <= _date
   order by rate_date desc limit 1;
  if v_rate is not null then
    return v_rate;
  end if;

  -- 2) inversă
  select 1.0 / nullif(rate, 0) into v_rate
    from public.exchange_rates
   where base = _to and quote = _from
     and rate_date <= _date
   order by rate_date desc limit 1;
  if v_rate is not null then
    return v_rate;
  end if;

  -- 3) pivot prin RON
  if _from = 'RON' or _to = 'RON' then
    return null; -- niciun pivot disponibil
  end if;

  select rate into v_from_to_ron
    from public.exchange_rates
   where base = _from and quote = 'RON'
     and rate_date <= _date
   order by rate_date desc limit 1;
  if v_from_to_ron is null then
    select 1.0 / nullif(rate, 0) into v_from_to_ron
      from public.exchange_rates
     where base = 'RON' and quote = _from
       and rate_date <= _date
     order by rate_date desc limit 1;
  end if;

  select rate into v_ron_to_to
    from public.exchange_rates
   where base = 'RON' and quote = _to
     and rate_date <= _date
   order by rate_date desc limit 1;
  if v_ron_to_to is null then
    select 1.0 / nullif(rate, 0) into v_ron_to_to
      from public.exchange_rates
     where base = _to and quote = 'RON'
       and rate_date <= _date
     order by rate_date desc limit 1;
  end if;

  if v_from_to_ron is not null and v_ron_to_to is not null then
    return v_from_to_ron * v_ron_to_to;
  end if;

  return null;
end;
$$;

revoke all on function public.fx_at(char(3), char(3), date) from public;
grant execute on function public.fx_at(char(3), char(3), date)
  to authenticated, service_role;

-- ---------- match_transactions ------------------------------------------
-- Top-K tranzacții similare semantic în household-ul dat. Returnează
-- distanța cosinus (1 - similarity) ca să poți sorta crescător.
create or replace function public.match_transactions(
  _household        uuid,
  _query_embedding  vector(1536),
  _limit            int default 10
)
returns table (
  id          uuid,
  occurred_on date,
  amount      bigint,
  currency    char(3),
  payee       text,
  notes       text,
  category_id uuid,
  similarity  numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    t.id,
    t.occurred_on,
    t.amount,
    t.currency,
    t.payee,
    t.notes,
    t.category_id,
    1 - (t.embedding <=> _query_embedding) as similarity
  from public.transactions t
  where t.household_id = _household
    and t.embedding is not null
    and t.household_id in (select app.user_household_ids())
  order by t.embedding <=> _query_embedding
  limit greatest(_limit, 1);
$$;

grant execute on function public.match_transactions(uuid, vector, int)
  to authenticated;

-- ---------- cashflow -----------------------------------------------------
-- Rollup pe categorii pentru un interval. Sumele rămân în minor units în
-- household.base_currency (folosim base_amount). Categoria NULL = neîncadrat.
create or replace function public.cashflow(
  _hh   uuid,
  _from date,
  _to   date
)
returns table (
  category_id uuid,
  category    text,
  type        public.category_type,
  income      bigint,
  expense     bigint,
  net         bigint,
  tx_count    bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with txs as (
    select
      t.category_id,
      coalesce(c.name, '— Necategorisit')                  as category,
      coalesce(c.type, 'expense'::public.category_type)    as type,
      coalesce(t.base_amount, t.amount)                    as amt
    from public.transactions t
    left join public.categories c on c.id = t.category_id
    where t.household_id = _hh
      and t.occurred_on between _from and _to
      and t.is_transfer = false
      and t.status in ('cleared'::public.tx_status, 'pending'::public.tx_status)
      and t.household_id in (select app.user_household_ids())
  )
  select
    category_id,
    category,
    type,
    sum(case when amt > 0 then amt else 0 end)::bigint   as income,
    sum(case when amt < 0 then -amt else 0 end)::bigint  as expense,
    sum(amt)::bigint                                     as net,
    count(*)::bigint                                     as tx_count
  from txs
  group by category_id, category, type
  order by abs(sum(amt)) desc;
$$;

grant execute on function public.cashflow(uuid, date, date) to authenticated;
