-- =====================================================================
-- 0025_seed_rules.sql — pre-seed rules pentru top merchanți români.
--
-- Strategie identică cu 0099_seed.sql: definim funcția
-- `public.seed_default_rules(_household_id uuid)` + trigger AFTER INSERT
-- pe households + backfill idempotent pentru gospodăriile existente.
--
-- Rule-urile sunt insert-uite cu prioritate 100 (default) și `is_active`
-- true; user-ul le poate dezactiva sau șterge oricând din /merchants
-- → /rules. Pattern-ul `match_payee_regex` folosește syntaxa POSIX
-- (case-insensitive cu `(?i)`). Fiecare rule e legat de o categorie
-- pre-seed-uită din 0099_seed.sql (lookup după nume + household_id).
-- =====================================================================

create or replace function public.seed_default_rules(_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cat_cumparaturi   uuid;
  cat_restaurante   uuid;
  cat_transport     uuid;
  cat_combustibil   uuid;
  cat_utilitati     uuid;
  cat_internet      uuid;
  cat_abonamente    uuid;
  cat_imobiliare    uuid;
  cat_numerar       uuid;
  cat_taxe          uuid;
  cat_tichete       uuid;
begin
  select id into cat_cumparaturi
    from public.categories
    where household_id = _household_id and name = 'Cumpărături' limit 1;
  select id into cat_restaurante
    from public.categories
    where household_id = _household_id and name = 'Restaurante' limit 1;
  select id into cat_transport
    from public.categories
    where household_id = _household_id and name = 'Transport' limit 1;
  select id into cat_combustibil
    from public.categories
    where household_id = _household_id and name = 'Combustibil' limit 1;
  select id into cat_utilitati
    from public.categories
    where household_id = _household_id and name = 'Utilități' limit 1;
  select id into cat_internet
    from public.categories
    where household_id = _household_id and name = 'Internet & Telefonie' limit 1;
  select id into cat_abonamente
    from public.categories
    where household_id = _household_id and name = 'Abonamente' limit 1;
  select id into cat_imobiliare
    from public.categories
    where household_id = _household_id and name = 'Imobiliare' limit 1;
  select id into cat_numerar
    from public.categories
    where household_id = _household_id and name = 'Numerar' limit 1;
  select id into cat_taxe
    from public.categories
    where household_id = _household_id and name = 'Taxe & Comisioane' limit 1;
  select id into cat_tichete
    from public.categories
    where household_id = _household_id and name = 'Tichete masă' limit 1;

  -- Idempotență: dacă deja există rule pre-seed-uite (după nume), nu mai
  -- inserăm. Userul poate șterge manual și re-rula seed-ul.
  if exists (
    select 1 from public.rules
    where household_id = _household_id
      and name like 'Auto: %'
  ) then
    return;
  end if;

  insert into public.rules
    (household_id, name, priority, match_payee_regex, set_category_id)
  values
    -- Supermarket / hipermarket
    (_household_id, 'Auto: Lidl',         100, '(?i)\mlidl\M',                 cat_cumparaturi),
    (_household_id, 'Auto: Kaufland',     100, '(?i)\mkaufland\M',             cat_cumparaturi),
    (_household_id, 'Auto: Carrefour',    100, '(?i)\mcarrefour\M',            cat_cumparaturi),
    (_household_id, 'Auto: Mega Image',   100, '(?i)\mmega ?image\M',          cat_cumparaturi),
    (_household_id, 'Auto: Auchan',       100, '(?i)\mauchan\M',               cat_cumparaturi),
    (_household_id, 'Auto: Profi',        100, '(?i)\mprofi\M',                cat_cumparaturi),
    (_household_id, 'Auto: Penny',        100, '(?i)\mpenny\M',                cat_cumparaturi),
    (_household_id, 'Auto: Selgros',      100, '(?i)\mselgros\M',              cat_cumparaturi),
    (_household_id, 'Auto: Metro',        100, '(?i)\mmetro\M',                cat_cumparaturi),

    -- E-commerce
    (_household_id, 'Auto: eMAG',         100, '(?i)\memag\M|\me\s?mag\M',     cat_cumparaturi),
    (_household_id, 'Auto: Altex',        100, '(?i)\maltex\M',                cat_cumparaturi),
    (_household_id, 'Auto: Flanco',       100, '(?i)\mflanco\M',               cat_cumparaturi),
    (_household_id, 'Auto: Dedeman',      100, '(?i)\mdedeman\M',              cat_imobiliare),
    (_household_id, 'Auto: IKEA',         100, '(?i)\mikea\M',                 cat_imobiliare),
    (_household_id, 'Auto: Hornbach',     100, '(?i)\mhornbach\M',             cat_imobiliare),

    -- Food delivery / restaurant
    (_household_id, 'Auto: Glovo',        100, '(?i)\mglovo\M',                cat_restaurante),
    (_household_id, 'Auto: Tazz',         100, '(?i)\mtazz\M',                 cat_restaurante),
    (_household_id, 'Auto: Bolt Food',    90,  '(?i)\mbolt food\M',            cat_restaurante),
    (_household_id, 'Auto: foodpanda',    100, '(?i)\mfoodpanda\M',            cat_restaurante),
    (_household_id, 'Auto: McDonalds',    100, '(?i)mcdonald',                 cat_restaurante),
    (_household_id, 'Auto: KFC',          100, '(?i)\mkfc\M',                  cat_restaurante),
    (_household_id, 'Auto: Starbucks',    100, '(?i)\mstarbucks\M',            cat_restaurante),
    (_household_id, 'Auto: Subway',       100, '(?i)\msubway\M',               cat_restaurante),

    -- Transport
    (_household_id, 'Auto: Bolt',         110, '(?i)\mbolt\M(?! food)',        cat_transport),
    (_household_id, 'Auto: Uber',         100, '(?i)\muber\M',                 cat_transport),
    (_household_id, 'Auto: FREE NOW',     100, '(?i)\mfree\s?now\M',           cat_transport),
    (_household_id, 'Auto: STB / RATB',   100, '(?i)\mstb\M|\mratb\M',         cat_transport),
    (_household_id, 'Auto: CFR',          100, '(?i)\mcfr\M',                  cat_transport),

    -- Combustibil
    (_household_id, 'Auto: OMV',          100, '(?i)\momv\M',                  cat_combustibil),
    (_household_id, 'Auto: Petrom',       100, '(?i)\mpetrom\M',               cat_combustibil),
    (_household_id, 'Auto: Rompetrol',    100, '(?i)\mrompetrol\M',            cat_combustibil),
    (_household_id, 'Auto: MOL',          100, '(?i)\mmol\M',                  cat_combustibil),
    (_household_id, 'Auto: Lukoil',       100, '(?i)\mlukoil\M',               cat_combustibil),

    -- Telecom (Internet & Telefonie)
    (_household_id, 'Auto: Digi',         100, '(?i)\mdigi\M|\mrcs[\s&-]?rds\M', cat_internet),
    (_household_id, 'Auto: Orange',       100, '(?i)\morange\M',               cat_internet),
    (_household_id, 'Auto: Vodafone',     100, '(?i)\mvodafone\M',             cat_internet),
    (_household_id, 'Auto: Telekom',      100, '(?i)\mtelekom\M',              cat_internet),

    -- Utilități
    (_household_id, 'Auto: Electrica',    100, '(?i)\menel\M|\melectrica\M|\me[\.-]?on\M|delgaz', cat_utilitati),
    (_household_id, 'Auto: Engie',        100, '(?i)\mengie\M|distrigaz',      cat_utilitati),
    (_household_id, 'Auto: Apa Nova',     100, '(?i)\mapa\s?nova\M',           cat_utilitati),

    -- Streaming / abonamente
    (_household_id, 'Auto: Netflix',      100, '(?i)\mnetflix\M',              cat_abonamente),
    (_household_id, 'Auto: Spotify',      100, '(?i)\mspotify\M',              cat_abonamente),
    (_household_id, 'Auto: HBO Max',      100, '(?i)\mhbo\M|\mhbomax\M',       cat_abonamente),
    (_household_id, 'Auto: Disney+',      100, '(?i)disney\+',                 cat_abonamente),
    (_household_id, 'Auto: YouTube Premium', 100, '(?i)youtube\s?premium',     cat_abonamente),
    (_household_id, 'Auto: Apple',        90,  '(?i)apple\.com|apple\s+(itunes|services)', cat_abonamente),
    (_household_id, 'Auto: Google',       90,  '(?i)google\s?(play|cloud|one)', cat_abonamente),
    (_household_id, 'Auto: iCloud',       100, '(?i)\micloud\M',               cat_abonamente),

    -- ATM / fee bancar
    (_household_id, 'Auto: ATM',          80,  '(?i)\matm\M|retragere numerar', cat_numerar),
    (_household_id, 'Auto: Comision',     80,  '(?i)\mcomision\M',             cat_taxe),

    -- Tichete masă
    (_household_id, 'Auto: Edenred',      100, '(?i)\medenred\M',              cat_tichete),
    (_household_id, 'Auto: Pluxee',       100, '(?i)\mpluxee\M|\msodexo\M',    cat_tichete),
    (_household_id, 'Auto: Up România',   100, '(?i)\mup\s?romania\M',         cat_tichete);
end;
$$;

-- Trigger pe households: rulează DUPĂ trg_seed_default_categories pentru
-- a putea referenția categoriile prin nume. Numele triggerului începe cu
-- `trg_seed_default_rules` (alfabetic > `trg_seed_default_categories`),
-- iar Postgres execută triggerele AFTER în ordine alfabetică pe nume.
create or replace function public.fn_seed_default_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.seed_default_rules(new.id);
  return new;
end;
$$;

drop trigger if exists trg_seed_default_rules on public.households;
create trigger trg_seed_default_rules
  after insert on public.households
  for each row execute function public.fn_seed_default_rules();

-- Backfill idempotent pentru gospodăriile existente.
do $$
declare
  hh record;
begin
  for hh in select id from public.households loop
    perform public.seed_default_rules(hh.id);
  end loop;
end;
$$;
