-- =====================================================================
-- 0007_invites.sql — invitații pentru mama (al doilea user în household).
--
-- Token random 32-byte (hex 64 caractere). Owner-ul / admin-ul invită,
-- userul invitat primește link `/invite/{token}` care, după magic-link
-- auth, asociază user-ul la household cu rolul stabilit.
--
-- RLS: doar membrii household-ului pot vedea invitațiile. Owner / admin
-- pot crea. Inserții publice nu sunt permise.
-- =====================================================================

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  invited_email text not null,
  role text not null check (role in ('admin','member','viewer')),
  token text not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists household_invites_household_idx
  on public.household_invites (household_id);
create index if not exists household_invites_email_idx
  on public.household_invites (lower(invited_email));

alter table public.household_invites enable row level security;

-- Owner/admin pot vedea invitațiile household-ului.
drop policy if exists "household_invites_select_member"
  on public.household_invites;
create policy "household_invites_select_member"
  on public.household_invites
  for select
  using (
    household_id = any(app.user_household_ids())
  );

-- Doar owner/admin pot crea invitații.
drop policy if exists "household_invites_insert_owner_admin"
  on public.household_invites;
create policy "household_invites_insert_owner_admin"
  on public.household_invites
  for insert
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_invites.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('owner','admin')
    )
  );

-- Owner/admin pot șterge (revoke) invitațiile pe care le-au creat sau
-- altele din household.
drop policy if exists "household_invites_delete_owner_admin"
  on public.household_invites;
create policy "household_invites_delete_owner_admin"
  on public.household_invites
  for delete
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_invites.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('owner','admin')
    )
  );

-- Update: doar pentru a marca accepted_at (folosit prin RPC).
drop policy if exists "household_invites_update_owner_admin"
  on public.household_invites;
create policy "household_invites_update_owner_admin"
  on public.household_invites
  for update
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_invites.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('owner','admin')
    )
  )
  with check (true);

-- ---------- RPC accept_invite -------------------------------------------
-- Apelat din pagina /invite/[token] după autentificare. Verifică token,
-- expires_at, marcheză accepted_at și inserează membership-ul. Folosim
-- security definer ca să bypăsăm RLS — verificăm noi auth.uid() & token.
create or replace function public.accept_invite(_token text)
returns table (household_id uuid, role text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite record;
  v_uid    uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;

  select * into v_invite
    from public.household_invites
   where token = _token
   limit 1;

  if not found then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;

  if v_invite.accepted_at is not null then
    raise exception 'invite_already_used' using errcode = 'P0001';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;

  -- Insert membership (UPSERT — dacă userul e deja în household, nu mai
  -- inserăm dar acceptăm token-ul).
  insert into public.household_members (household_id, user_id, role)
  values (v_invite.household_id, v_uid, v_invite.role)
  on conflict (household_id, user_id) do update
    set role = excluded.role;

  -- Setăm active_household pentru profile dacă userul nu are unul activ.
  update public.profiles
     set active_household = coalesce(active_household, v_invite.household_id)
   where id = v_uid;

  -- Marchează invitația ca acceptată.
  update public.household_invites
     set accepted_at = now()
   where id = v_invite.id;

  household_id := v_invite.household_id;
  role := v_invite.role;
  return next;
end;
$$;

grant execute on function public.accept_invite(text) to authenticated;

comment on table public.household_invites is
  'Invitații nominale (per email) pentru mama / alți membri ai household-ului.';
comment on function public.accept_invite(text) is
  'Acceptă o invitație: validează token, inserează household_members, marcheză accepted_at.';
