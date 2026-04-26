-- =====================================================================
-- 0006_fx_cron.sql — FX sync log + pg_cron job zilnic.
--
-- Tabela `fx_sync_log` reține rezultatul fiecărei rulări (manuală sau
-- prin cron) pentru debugging. Cron-ul rulează 10:30 Europe/Bucharest
-- doar în zilele lucrătoare (BNR publică o singură rată/zi în jur de
-- 13:00 EET; rulăm înainte de cumulul de tranzacții, dar prima
-- afișare ON lcrare cere ca rate-urile să fie deja la zi).
--
-- Cron-ul invocă Edge Function `/functions/v1/fx-update` via pg_net,
-- cu Authorization Bearer din `app.cron_secret` (Supabase Vault).
-- =====================================================================

-- ---------- Tabela de log -------------------------------------------------
create table if not exists public.fx_sync_log (
  id bigserial primary key,
  run_at timestamptz not null default now(),
  status text not null check (status in ('ok','partial','error')),
  source text not null check (source in ('BNR','Frankfurter','manual','historical')),
  currencies_updated integer not null default 0,
  rate_date date,
  error text
);

create index if not exists fx_sync_log_run_at_idx
  on public.fx_sync_log (run_at desc);

alter table public.fx_sync_log enable row level security;

-- Doar service_role poate citi / scrie. Useri obișnuiți nu au nevoie de log.
drop policy if exists "fx_sync_log_service_only" on public.fx_sync_log;
create policy "fx_sync_log_service_only" on public.fx_sync_log
  for all to service_role using (true) with check (true);

-- ---------- Helper care apelează Edge Function ---------------------------
create or replace function app.invoke_fx_update()
returns void
language plpgsql
security definer
set search_path = public, extensions, net, vault, pg_temp
as $$
declare
  v_url    text;
  v_secret text;
begin
  -- URL-ul edge function: project_url + /functions/v1/fx-update.
  -- `app.project_url` e setat în Vault la deploy (no public exposure).
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'app.project_url';

  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'app.cron_secret';

  if v_url is null or v_secret is null then
    insert into public.fx_sync_log (status, source, error)
    values ('error', 'manual',
      'Vault keys lipsesc: app.project_url sau app.cron_secret');
    return;
  end if;

  perform net.http_post(
    url := v_url || '/functions/v1/fx-update',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb
  );
end;
$$;

-- ---------- Cron --------------------------------------------------------
-- Rulează la 10:30 (server UTC) în zilele lucrătoare. BNR publică zilnic
-- până la ora 13:00 EET — ne asigurăm că rate-urile de IERI sunt în BD
-- (BNR păstrează istoricul pe `nbrfxrates.xml`).
do $$
begin
  perform cron.unschedule('fx-update-daily');
exception when others then null;
end $$;

select cron.schedule(
  'fx-update-daily',
  '30 10 * * 1-5',
  $$ select app.invoke_fx_update(); $$
);

comment on function app.invoke_fx_update() is
  'Apelează Edge Function fx-update via pg_net. Folosit de cron-ul fx-update-daily.';
comment on table public.fx_sync_log is
  'Log al rulărilor pipeline-ului FX (BNR primary, Frankfurter fallback).';
