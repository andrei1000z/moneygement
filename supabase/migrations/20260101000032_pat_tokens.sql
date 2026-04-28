-- =====================================================================
-- 0032_pat_tokens.sql — Personal Access Tokens (PAT) pentru API extern.
--
-- Folosit de Banii MCP server (Claude Desktop) și orice client extern
-- care vrea să citească/scrie date prin REST API.
--
-- Token e hash-uit înainte de stocare (sha256). User-ul vede token-ul
-- în clear DOAR la generare. Stocăm prefix (8 caractere) pentru
-- identificare în UI fără a expune secretul.
-- =====================================================================

create table if not exists public.pat_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,                                 -- 'Claude Desktop', 'CLI dev', etc.
  token_prefix text not null,                         -- primele 8 chars din token (display)
  token_hash text not null unique,                    -- sha256 hex al token-ului complet
  scopes text[] not null default array['read'],       -- ['read', 'write']
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now(),
  revoked_at timestamptz
);

create index if not exists pat_tokens_user_idx
  on public.pat_tokens (user_id) where revoked_at is null;

create index if not exists pat_tokens_hash_idx
  on public.pat_tokens (token_hash) where revoked_at is null;

alter table public.pat_tokens enable row level security;

drop policy if exists "pat_select_own" on public.pat_tokens;
create policy "pat_select_own" on public.pat_tokens
  for select using (user_id = auth.uid());

drop policy if exists "pat_insert_own" on public.pat_tokens;
create policy "pat_insert_own" on public.pat_tokens
  for insert with check (
    user_id = auth.uid()
    and household_id in (select app.user_household_ids())
  );

drop policy if exists "pat_update_own" on public.pat_tokens;
create policy "pat_update_own" on public.pat_tokens
  for update using (user_id = auth.uid());

drop policy if exists "pat_delete_own" on public.pat_tokens;
create policy "pat_delete_own" on public.pat_tokens
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.pat_tokens to authenticated;

comment on table public.pat_tokens is
  'Personal Access Tokens pentru autentificare externă (MCP server, CLI, etc.). Tokenul brut nu se stochează — doar sha256 hash + primele 8 chars pentru identificare UI.';
