-- =====================================================================
-- 0031_webauthn.sql — Passkey login (FIDO2/WebAuthn).
--
-- Stochează credentials per user (mai multe device-uri = multiple rows).
-- credential_id e identificatorul unic al passkey-ului (base64url).
-- public_key e cheia COSE serialized care verifică semnăturile.
-- counter previne replay attacks (incrementat la fiecare auth).
-- =====================================================================

create table if not exists public.webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,        -- base64url
  public_key bytea not null,                  -- COSE-serialized public key
  counter bigint not null default 0,
  device_name text,                           -- "iPhone Andrei", "MacBook", "USB key"
  transports text[],                          -- ["internal","hybrid","usb","nfc","ble"]
  created_at timestamptz default now(),
  last_used_at timestamptz
);

create index if not exists webauthn_user_idx on public.webauthn_credentials (user_id);

-- Challenge ephemerel per ceremony — TTL 5 minute.
create table if not exists public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge text not null unique,
  user_id uuid references auth.users(id) on delete cascade,
  email text,                                 -- pentru auth flow (signin)
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  consumed_at timestamptz
);

create index if not exists webauthn_challenges_expires_idx
  on public.webauthn_challenges (expires_at)
  where consumed_at is null;

alter table public.webauthn_credentials enable row level security;
alter table public.webauthn_challenges enable row level security;

drop policy if exists "webauthn_select_own" on public.webauthn_credentials;
create policy "webauthn_select_own" on public.webauthn_credentials
  for select using (user_id = auth.uid());

drop policy if exists "webauthn_insert_own" on public.webauthn_credentials;
create policy "webauthn_insert_own" on public.webauthn_credentials
  for insert with check (user_id = auth.uid());

drop policy if exists "webauthn_delete_own" on public.webauthn_credentials;
create policy "webauthn_delete_own" on public.webauthn_credentials
  for delete using (user_id = auth.uid());

-- Challenges sunt accesate doar via service_role în API routes.
drop policy if exists "webauthn_challenges_service" on public.webauthn_challenges;
create policy "webauthn_challenges_service" on public.webauthn_challenges
  for all to service_role using (true) with check (true);

grant select, insert, delete on public.webauthn_credentials to authenticated;
grant all on public.webauthn_challenges to service_role;

-- Cleanup periodic: șterge challenge-urile expirate (rulat manual sau via pg_cron).
create or replace function public.cleanup_webauthn_challenges()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.webauthn_challenges
   where expires_at < now() - interval '1 hour';
$$;

comment on table public.webauthn_credentials is
  'Passkey-uri (FIDO2 credentials) pentru fiecare user. Multiple per user (telefon + laptop + USB key).';
comment on table public.webauthn_challenges is
  'Challenge-uri ephemerel pentru ceremoniile WebAuthn (registration + authentication). TTL 5 minute.';
