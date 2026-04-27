-- =====================================================================
-- 0008_ai.sql — coadă embeddings + tabele chat + recap-uri săptămânale.
--
-- Embeddings: introducem o coadă tip outbox (`embedding_queue`) populată
-- de un trigger AFTER INSERT/UPDATE pe `transactions`. Un cron + Edge
-- Function drain-uiește coada în batch-uri și apelează OpenAI.
--
-- Chat: thread-uri per household, mesaje cu `embedding` opțional pentru
-- semantic recall (ultimele 3 thread-uri similare → injectate în system).
--
-- Recap: weekly recap stocat ca rând în `recaps`.
-- =====================================================================

-- ---------- Embedding queue ---------------------------------------------
create table if not exists public.embedding_queue (
  id bigserial primary key,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  enqueued_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts integer not null default 0,
  error text
);

create index if not exists embedding_queue_pending_idx
  on public.embedding_queue (enqueued_at)
  where processed_at is null;

alter table public.embedding_queue enable row level security;

drop policy if exists "embedding_queue_service_only" on public.embedding_queue;
create policy "embedding_queue_service_only" on public.embedding_queue
  for all to service_role using (true) with check (true);

-- Trigger: după INSERT sau UPDATE pe `transactions` care schimbă
-- payee/notes/tags, înqueue pentru re-embedding.
create or replace function public.fn_enqueue_embedding()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.embedding_queue (transaction_id) values (new.id);
    return new;
  elsif (tg_op = 'UPDATE') then
    if (
      (old.payee is distinct from new.payee) or
      (old.notes is distinct from new.notes) or
      (old.tags is distinct from new.tags)
    ) then
      -- Resetăm embedding-ul vechi; cron-ul va re-popula.
      new.embedding := null;
      insert into public.embedding_queue (transaction_id) values (new.id);
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_enqueue_embedding on public.transactions;
create trigger trg_enqueue_embedding
  after insert or update on public.transactions
  for each row execute function public.fn_enqueue_embedding();

-- ---------- Chat threads + messages -------------------------------------
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Conversație nouă',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_chat_threads_updated_at
  before update on public.chat_threads
  for each row execute function app.set_updated_at();

create index if not exists chat_threads_household_idx
  on public.chat_threads (household_id, last_message_at desc nulls last);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  content text not null,
  embedding vector(1536),
  tool_calls jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_thread_idx
  on public.chat_messages (thread_id, created_at);
create index if not exists chat_messages_embedding_hnsw_idx
  on public.chat_messages using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

alter table public.chat_threads  enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "chat_threads_select" on public.chat_threads;
create policy "chat_threads_select" on public.chat_threads
  for select using (household_id in (select app.user_household_ids()));

drop policy if exists "chat_threads_insert" on public.chat_threads;
create policy "chat_threads_insert" on public.chat_threads
  for insert with check (
    user_id = auth.uid() and
    household_id in (select app.user_household_ids())
  );

drop policy if exists "chat_threads_update" on public.chat_threads;
create policy "chat_threads_update" on public.chat_threads
  for update using (
    user_id = auth.uid() and
    household_id in (select app.user_household_ids())
  );

drop policy if exists "chat_threads_delete" on public.chat_threads;
create policy "chat_threads_delete" on public.chat_threads
  for delete using (
    user_id = auth.uid() and
    household_id in (select app.user_household_ids())
  );

drop policy if exists "chat_messages_select" on public.chat_messages;
create policy "chat_messages_select" on public.chat_messages
  for select using (
    exists (
      select 1 from public.chat_threads t
      where t.id = chat_messages.thread_id
        and t.household_id in (select app.user_household_ids())
    )
  );

drop policy if exists "chat_messages_insert" on public.chat_messages;
create policy "chat_messages_insert" on public.chat_messages
  for insert with check (
    exists (
      select 1 from public.chat_threads t
      where t.id = chat_messages.thread_id
        and t.user_id = auth.uid()
    )
  );

-- ---------- Recap săptămânal --------------------------------------------
create table if not exists public.recaps (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  bullets jsonb not null,            -- array de obiecte { type, text, value }
  highlight text,                    -- propoziția principală
  generated_at timestamptz not null default now(),
  unique (household_id, period_start, period_end)
);

create index if not exists recaps_household_idx
  on public.recaps (household_id, period_start desc);

alter table public.recaps enable row level security;

drop policy if exists "recaps_select_member" on public.recaps;
create policy "recaps_select_member" on public.recaps
  for select using (household_id in (select app.user_household_ids()));

drop policy if exists "recaps_service_write" on public.recaps;
create policy "recaps_service_write" on public.recaps
  for all to service_role using (true) with check (true);

-- ---------- Subscriptions detectate ------------------------------------
create table if not exists public.detected_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  merchant_id uuid references public.merchants(id) on delete set null,
  payee text not null,
  cadence text not null,             -- 'monthly','yearly','weekly','biweekly','quarterly'
  median_amount bigint not null,     -- minor units, base currency
  currency char(3) not null,
  occurrences_count integer not null,
  first_seen date not null,
  last_seen date not null,
  status text not null default 'active' check (status in ('active','paused','cancelled')),
  price_hike_alert numeric(5,2),     -- % crescut față de baseline (median ultimele 6 ocurențe)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, payee, cadence, currency)
);

create trigger trg_detected_subs_updated_at
  before update on public.detected_subscriptions
  for each row execute function app.set_updated_at();

create index if not exists detected_subscriptions_household_idx
  on public.detected_subscriptions (household_id, status);

alter table public.detected_subscriptions enable row level security;

drop policy if exists "subs_select_member" on public.detected_subscriptions;
create policy "subs_select_member" on public.detected_subscriptions
  for select using (household_id in (select app.user_household_ids()));

drop policy if exists "subs_service_write" on public.detected_subscriptions;
create policy "subs_service_write" on public.detected_subscriptions
  for all to service_role using (true) with check (true);

drop policy if exists "subs_member_status_update" on public.detected_subscriptions;
create policy "subs_member_status_update" on public.detected_subscriptions
  for update using (household_id in (select app.user_household_ids()))
  with check (household_id in (select app.user_household_ids()));

comment on table public.embedding_queue is
  'Coadă outbox pentru embeddings transactions; drained de fn process-embeddings.';
comment on table public.chat_threads is
  'Thread-uri AI chat per household. Last_message_at folosit pentru sortare lateral.';
comment on table public.chat_messages is
  'Mesaje AI chat. Embedding opțional pentru semantic recall în context.';
comment on table public.recaps is
  'Weekly recap auto-generat luni dimineața (4 bullets warm-friend).';
comment on table public.detected_subscriptions is
  'Abonamente detectate via median-gap algorithm; user poate marca cancelled.';
