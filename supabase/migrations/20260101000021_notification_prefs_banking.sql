-- =====================================================================
-- 0021_notification_prefs_banking.sql — preferințe notificări +
-- coloane bank-sync status + cron-uri push.
-- =====================================================================

-- ---------- Coloane bank_connections sync status (H6) -------------------
alter table public.bank_connections
  add column if not exists last_sync_status text
    check (last_sync_status in ('ok','partial','error') or last_sync_status is null);
alter table public.bank_connections
  add column if not exists last_sync_error text;
alter table public.bank_connections
  add column if not exists last_sync_count integer not null default 0;

-- ---------- Notification preferences ------------------------------------
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_bills boolean not null default true,
  push_anomalies boolean not null default true,
  push_goal_milestones boolean not null default true,
  push_weekly_recap boolean not null default true,
  push_low_balance boolean not null default true,
  push_bank_reauth boolean not null default true,
  push_anniversaries boolean not null default false,
  /** Format 'HH:MM' pentru fereastră quiet (ex: 22:00 → 08:00). */
  quiet_start text,
  quiet_end text,
  low_balance_threshold_minor bigint not null default 50000, -- 500 lei
  updated_at timestamptz not null default now()
);

create trigger trg_notif_prefs_updated_at
  before update on public.notification_preferences
  for each row execute function app.set_updated_at();

alter table public.notification_preferences enable row level security;

drop policy if exists "notif_prefs_select_own" on public.notification_preferences;
create policy "notif_prefs_select_own" on public.notification_preferences
  for select using (user_id = auth.uid());

drop policy if exists "notif_prefs_upsert_own" on public.notification_preferences;
create policy "notif_prefs_upsert_own" on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Cron-uri push triggers (G7, H8) ----------------------------
-- Bill reminder cron — zilnic 09:00 EET (07:00 UTC).
create or replace function app.invoke_push_dispatch()
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
    url := v_url || '/functions/v1/push-dispatch',
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
  perform cron.unschedule('push-dispatch-daily');
exception when others then null;
end $$;

select cron.schedule(
  'push-dispatch-daily',
  '0 7 * * *',
  $$ select app.invoke_push_dispatch(); $$
);

comment on function app.invoke_push_dispatch() is
  'Apelată zilnic 07:00 UTC pentru: bill reminders, low-balance alerts, bank reauth alerts, anniversaries.';
comment on table public.notification_preferences is
  'Preferințe push per user (per tip notificare + quiet hours + threshold).';
