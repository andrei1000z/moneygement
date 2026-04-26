-- =====================================================================
-- 0010_banking_cron.sql — cron 6 ore pentru bank-sync.
-- =====================================================================

create or replace function app.invoke_bank_sync()
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

  if v_url is null or v_secret is null then return; end if;

  perform net.http_post(
    url := v_url || '/functions/v1/bank-sync',
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
  perform cron.unschedule('bank-sync-6h');
exception when others then null;
end $$;

select cron.schedule(
  'bank-sync-6h',
  '15 */6 * * *',
  $$ select app.invoke_bank_sync(); $$
);

comment on function app.invoke_bank_sync() is
  'Apelată la 6h pentru sincronizarea conturilor Enable Banking.';
