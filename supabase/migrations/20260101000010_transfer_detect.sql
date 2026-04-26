-- =====================================================================
-- 0010_transfer_detect.sql — auto-detect transfer pe insert.
--
-- Strategie: la INSERT pe `transactions`, căutăm o tranzacție „pereche"
-- în ultimele 3 zile cu suma exact opusă, în alt cont, aceeași monedă,
-- același household, neîncadrată deja ca transfer. Dacă o găsim,
-- legăm bidirecțional și marcăm ambele ca `is_transfer = true`.
--
-- NU rulează pentru `source = 'transfer'` (acolo aplicația marchează
-- explicit perechile, ca să nu intrăm în loop).
-- =====================================================================

create or replace function public.fn_detect_transfer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pair_id uuid;
begin
  -- Skip dacă e deja marcată ca transfer sau e creată de logica internă
  -- (split / transfer manual / cron jobs care setează source='transfer').
  if new.is_transfer = true or new.source = 'transfer' then
    return new;
  end if;

  -- Caută o tx pereche: aceeași monedă, sumă opusă, household identic,
  -- alt cont, în ±3 zile calendaristice de la occurred_on, neîncadrată
  -- ca transfer.
  select t.id
    into v_pair_id
    from public.transactions t
   where t.household_id = new.household_id
     and t.account_id <> new.account_id
     and t.currency = new.currency
     and t.amount = -new.amount
     and t.is_transfer = false
     and t.occurred_on between (new.occurred_on - interval '3 days')::date
                          and (new.occurred_on + interval '3 days')::date
     and t.id <> new.id
   order by abs(extract(epoch from (t.occurred_on - new.occurred_on))) asc,
            t.created_at desc
   limit 1;

  if v_pair_id is null then
    return new;
  end if;

  -- Setăm câmpurile pe NEW (rândul în curs de inserare).
  new.is_transfer := true;
  new.transfer_pair_id := v_pair_id;

  -- Și pe perechea deja existentă (UPDATE separat — trigger-ul
  -- fn_detect_transfer NU se reapelează pentru că check-ul de mai sus
  -- vede deja `is_transfer = true` și iese imediat).
  update public.transactions
     set is_transfer = true,
         transfer_pair_id = new.id
   where id = v_pair_id;

  return new;
end;
$$;

drop trigger if exists trg_detect_transfer on public.transactions;
create trigger trg_detect_transfer
  before insert on public.transactions
  for each row execute function public.fn_detect_transfer();
