-- =====================================================================
-- 0003_triggers.sql — triggere de business logic.
--
--   * handle_new_user      — la INSERT pe auth.users creează profile +
--                             household personal + membership owner.
--   * fn_tx_balance        — BEFORE INSERT/UPDATE/DELETE pe transactions,
--                             actualizează accounts.current_balance.
--   * fn_tx_base_amount    — BEFORE INSERT/UPDATE pe transactions,
--                             calculează base_amount din exchange_rates.
-- =====================================================================

-- ---------- handle_new_user ---------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_household_id uuid;
  v_full_name    text;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Utilizator'
  );

  insert into public.profiles (id, full_name)
  values (new.id, v_full_name);

  insert into public.households (name)
  values (
    coalesce(
      new.raw_user_meta_data->>'household_name',
      concat('Casa ', v_full_name)
    )
  )
  returning id into v_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (v_household_id, new.id, 'owner');

  update public.profiles
     set active_household = v_household_id
   where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- fn_tx_balance -----------------------------------------------
-- Notă: BEFORE pe transactions, conform spec. Update-ul rulează în aceeași
-- tranzacție; dacă INSERT-ul eșuează ulterior, se rollback și balance-ul.
create or replace function public.fn_tx_balance()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.accounts
       set current_balance = current_balance + new.amount,
           updated_at = now()
     where id = new.account_id;
    return new;

  elsif (TG_OP = 'UPDATE') then
    if old.account_id = new.account_id then
      if old.amount <> new.amount then
        update public.accounts
           set current_balance = current_balance - old.amount + new.amount,
               updated_at = now()
         where id = new.account_id;
      end if;
    else
      update public.accounts
         set current_balance = current_balance - old.amount,
             updated_at = now()
       where id = old.account_id;
      update public.accounts
         set current_balance = current_balance + new.amount,
             updated_at = now()
       where id = new.account_id;
    end if;
    return new;

  elsif (TG_OP = 'DELETE') then
    update public.accounts
       set current_balance = current_balance - old.amount,
           updated_at = now()
     where id = old.account_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_tx_balance on public.transactions;
create trigger trg_tx_balance
  before insert or update or delete on public.transactions
  for each row execute function public.fn_tx_balance();

-- ---------- fn_tx_base_amount -------------------------------------------
-- Calculează NEW.base_amount în household.base_currency. Dacă tranzacția
-- e în moneda gospodăriei, copy direct. Altfel căutăm rata pe `occurred_on`
-- în exchange_rates, cu fallback la cea mai recentă zi lucrătoare ≤ data.
-- Cross-rate prin RON dacă perechea directă lipsește (ex.: EUR→USD).
create or replace function public.fn_tx_base_amount()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_base_currency char(3);
  v_rate          numeric(18,8);
begin
  if new.currency is null then
    return new;
  end if;

  select base_currency into v_base_currency
    from public.households
   where id = new.household_id;

  if v_base_currency is null or new.currency = v_base_currency then
    new.base_amount := new.amount;
    return new;
  end if;

  -- 1) directă: from -> base
  select rate into v_rate
    from public.exchange_rates
   where base = new.currency
     and quote = v_base_currency
     and rate_date <= new.occurred_on
   order by rate_date desc
   limit 1;

  -- 2) inversă: base -> from (rate_inversed = 1 / rate)
  if v_rate is null then
    select 1.0 / nullif(rate, 0) into v_rate
      from public.exchange_rates
     where base = v_base_currency
       and quote = new.currency
       and rate_date <= new.occurred_on
     order by rate_date desc
     limit 1;
  end if;

  -- 3) pivot prin RON: from -> RON -> base (sau invers)
  if v_rate is null and v_base_currency <> 'RON' and new.currency <> 'RON' then
    declare
      v_from_to_ron numeric(18,8);
      v_ron_to_base numeric(18,8);
    begin
      select rate into v_from_to_ron
        from public.exchange_rates
       where base = new.currency and quote = 'RON'
         and rate_date <= new.occurred_on
       order by rate_date desc limit 1;

      if v_from_to_ron is null then
        select 1.0 / nullif(rate, 0) into v_from_to_ron
          from public.exchange_rates
         where base = 'RON' and quote = new.currency
           and rate_date <= new.occurred_on
         order by rate_date desc limit 1;
      end if;

      select rate into v_ron_to_base
        from public.exchange_rates
       where base = 'RON' and quote = v_base_currency
         and rate_date <= new.occurred_on
       order by rate_date desc limit 1;

      if v_ron_to_base is null then
        select 1.0 / nullif(rate, 0) into v_ron_to_base
          from public.exchange_rates
         where base = v_base_currency and quote = 'RON'
           and rate_date <= new.occurred_on
         order by rate_date desc limit 1;
      end if;

      if v_from_to_ron is not null and v_ron_to_base is not null then
        v_rate := v_from_to_ron * v_ron_to_base;
      end if;
    end;
  end if;

  if v_rate is not null then
    new.base_amount := round(new.amount * v_rate)::bigint;
    if new.exchange_rate is null then
      new.exchange_rate := v_rate;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tx_base_amount on public.transactions;
create trigger trg_tx_base_amount
  before insert or update on public.transactions
  for each row execute function public.fn_tx_base_amount();
