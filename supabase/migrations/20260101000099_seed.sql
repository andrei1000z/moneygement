-- =====================================================================
-- 0099_seed.sql — seed-ul gospodăriei.
--
-- Strategie: NU inserăm direct în categories. Definim funcția
-- `public.seed_default_categories(_household_id uuid)` și un trigger
-- AFTER INSERT pe households care o apelează automat. Toate gospodăriile
-- noi (inclusiv cele create de handle_new_user) primesc cele 25 de
-- categorii românești default cu icon emoji + tip corect (income /
-- expense / transfer) + is_system = true.
-- =====================================================================

create or replace function public.seed_default_categories(_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.categories
    (household_id, name, type, icon, is_system)
  values
    -- Esențiale (expense)
    (_household_id, 'Mâncare',                'expense'::public.category_type, '🛒', true),
    (_household_id, 'Mâncare la pachet',      'expense'::public.category_type, '🥡', true),
    (_household_id, 'Restaurante',            'expense'::public.category_type, '🍽️', true),
    (_household_id, 'Transport',              'expense'::public.category_type, '🚌', true),
    (_household_id, 'Combustibil',            'expense'::public.category_type, '⛽', true),
    (_household_id, 'Utilități',              'expense'::public.category_type, '💡', true),
    (_household_id, 'Internet & Telefonie',   'expense'::public.category_type, '📶', true),
    (_household_id, 'Abonamente',             'expense'::public.category_type, '🔁', true),
    (_household_id, 'Sănătate',               'expense'::public.category_type, '💊', true),
    (_household_id, 'Cumpărături',            'expense'::public.category_type, '🛍️', true),
    (_household_id, 'Educație',               'expense'::public.category_type, '📚', true),
    (_household_id, 'Taxe & Comisioane',      'expense'::public.category_type, '🧾', true),
    (_household_id, 'Imobiliare',             'expense'::public.category_type, '🏠', true),
    (_household_id, 'Copii & Familie',        'expense'::public.category_type, '👨‍👩‍👧', true),
    (_household_id, 'Cadouri & Donații',      'expense'::public.category_type, '🎁', true),
    (_household_id, 'Călătorii',              'expense'::public.category_type, '✈️', true),
    (_household_id, 'Hobby & Recreere',       'expense'::public.category_type, '🎨', true),
    (_household_id, 'Frumusețe & Îngrijire',  'expense'::public.category_type, '💅', true),
    (_household_id, 'Sport & Wellness',       'expense'::public.category_type, '🏋️', true),
    (_household_id, 'Asigurări',              'expense'::public.category_type, '🛡️', true),
    (_household_id, 'Numerar',                'expense'::public.category_type, '💵', true),
    -- Venituri
    (_household_id, 'Salariu',                'income'::public.category_type,  '💼', true),
    (_household_id, 'Tichete masă',           'income'::public.category_type,  '🎟️', true),
    (_household_id, 'Pensie',                 'income'::public.category_type,  '👵', true),
    -- Transferuri
    (_household_id, 'Transferuri & Economii', 'transfer'::public.category_type,'🔀', true)
  on conflict (household_id, parent_id, name) do nothing;
end;
$$;

-- Wrapper de trigger: ia household-ul nou și apelează helper-ul.
create or replace function public.fn_seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

drop trigger if exists trg_seed_default_categories on public.households;
create trigger trg_seed_default_categories
  after insert on public.households
  for each row execute function public.fn_seed_default_categories();

-- Pentru householduri existente la momentul rulării seed-ului, popularea
-- e idempotentă (ON CONFLICT DO NOTHING).
do $$
declare
  hh record;
begin
  for hh in select id from public.households loop
    perform public.seed_default_categories(hh.id);
  end loop;
end;
$$;
