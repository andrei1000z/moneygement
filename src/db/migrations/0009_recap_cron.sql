-- =====================================================================
-- 0009_recap_cron.sql — cron luni 8:00 EET pentru weekly recap.
-- =====================================================================

create or replace function app.invoke_weekly_recap()
returns void
language plpgsql
security definer
set search_path = public, extensions, net, vault, pg_temp
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'app.project_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'app.cron_secret';

  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url := v_url || '/functions/v1/weekly-recap',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb
  );
end;
$$;

-- Cron: luni la 06:00 UTC = 08:00 EET (vara), 09:00 EET (iarna).
-- Acceptăm flotare 1h vara/iarna — recap-ul nu e time-critical.
do $$
begin
  perform cron.unschedule('weekly-recap-monday');
exception when others then null;
end $$;

select cron.schedule(
  'weekly-recap-monday',
  '0 6 * * 1',
  $$ select app.invoke_weekly_recap(); $$
);

-- Cron pentru process-embeddings (la 5 minute).
create or replace function app.invoke_process_embeddings()
returns void
language plpgsql
security definer
set search_path = public, extensions, net, vault, pg_temp
as $$
declare
  v_url    text;
  v_secret text;
  v_pending integer;
begin
  select count(*) into v_pending
    from public.embedding_queue
   where processed_at is null;

  if v_pending = 0 then return; end if;

  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'app.project_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'app.cron_secret';

  if v_url is null or v_secret is null then return; end if;

  perform net.http_post(
    url := v_url || '/functions/v1/process-embeddings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb
  );
end;
$$;

do $$
begin
  perform cron.unschedule('process-embeddings');
exception when others then null;
end $$;

select cron.schedule(
  'process-embeddings',
  '*/5 * * * *',
  $$ select app.invoke_process_embeddings(); $$
);

comment on function app.invoke_weekly_recap() is
  'Apelată de cron weekly-recap-monday (luni 06:00 UTC).';
comment on function app.invoke_process_embeddings() is
  'Apelată de cron process-embeddings la fiecare 5 minute, dacă coada nu e goală.';
