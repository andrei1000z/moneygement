# FINISH_PROMPT.md — promptul mare pentru Claude Code

> **Cum folosești:** deschide Claude Code în folder-ul `C:\Users\Andrei\Desktop\banii`,
> copiază conținutul de mai jos (de la "Citește în ordine..." până la final) și
> lipește-l ca primul mesaj. Claude Code va parcurge etapele A→J pe rând, va
> commita după fiecare, și se va opri la sfârșit.
>
> **Înainte să rulezi:**
> 1. `git add . && git commit -m "checkpoint: pre-finalizare"` (NU ai niciun commit acum!)
> 2. `.env.local` complet (vezi `.env.example`)
> 3. Migrațiile aplicate pe Supabase (`npx supabase db push`)
> 4. Extensions activate în Supabase: `pgcrypto`, `vector`, `pg_trgm`, `pg_cron`, `pg_net`

---

```
Citește în ordine: BLUEPRINT.md, CLAUDE.md, AGENTS.md, AUDIT.md.

Misiune: Finalizezi proiectul Banii până la MVP complet conform BLUEPRINT secțiunea 11. Lucrezi pe etape mici, commit per etapă cu mesaj descriptiv în română. La finalul fiecărei etape rulezi `npm run typecheck` și `npm run lint` — dacă apar erori noi, le repari ÎNAINTE să treci la etapa următoare. NU treci peste o etapă cu erori.

Stack lock — vezi CLAUDE.md §2. NU schimba versiuni majore. Bani = BIGINT minor units, format ro-RO, RLS pe tot, server-only pe secrete.

Dacă o etapă e prea mare pentru o singură rundă, oprește-te la sfârșitul ultimei sub-etape complete și raportează status. Voi confirma și continui.

═══════════════════════════════════════════════════════════════
ETAPA A — Repară erorile existente (typecheck + lint clean)
═══════════════════════════════════════════════════════════════

A1. `src/components/features/dashboard/calendar-heatmap.tsx:71`
    react-calendar-heatmap a schimbat tipurile la `ReactCalendarHeatmapValue<ReactCalendarHeatmapDate>`.
    Schimbă tipurile parametrilor în `classForValue`/`titleForValue`/`onClick`
    la `ReactCalendarHeatmapValue<ReactCalendarHeatmapDate> | undefined`
    (importă tipul din "react-calendar-heatmap"). În interior: cast localizat
    `as unknown as { date?: string; count?: number }` sau folosește type guard
    cu `if (!v) return ...` și `(v as any).date / .count`.
    Acceptabil cast localizat fiindcă lib-ul nu expune type util-ul nostru.

A2. `src/components/features/dashboard/mini-sankey.tsx:57`
    Pentru Nivo Sankey, schimbă `colors={(node) => node.nodeColor}` cu
    `colors={(node: any) => (node.data as any)?.nodeColor ?? "#888"}` SAU
    folosește o paletă statică `colors={{ scheme: 'category10' }}`.
    Verifică în `node_modules/@nivo/sankey/dist/types/` ce expune SankeyNodeDatum.

A3. `src/components/features/insights/category-treemap.tsx:63`
    `formattedValue` e `string | number`. Schimbă cast-ul cu
    `String(node.formattedValue)` sau `node.formattedValue.toString()`.

A4. `src/components/features/insights/income-vs-expense-chart.tsx:72`
    și `src/components/features/insights/net-worth-chart.tsx:75`.
    Recharts `Formatter` așteaptă `(value: ValueType, name: NameType, ...)`.
    Schimbă semnătura: `(value: number | string | undefined) => string`
    și gestionează cu `value == null ? "" : formatRON(Number(value))`.

A5. `src/components/features/dashboard/recent-transactions.tsx:29`
    Înlocuiește `"` literale în JSX cu `&ldquo;` și `&rdquo;` sau folosește
    template string într-o variabilă în afara JSX-ului.

A6. Curăță warnings simple (unused imports/vars) din: `accounts/actions.ts`
    (linia 113 `e`, 224 `_ids`), `goal-form.tsx` (`formSchema`),
    `transaction-detail.tsx` (`TransactionRow`), `transaction-form.tsx`
    (`useState`, `transactionInputSchema`), `transaction-filters.tsx`
    (linii 54 + 63 unused expressions).
    NU atinge react-compiler warnings pe `form.watch()` și `useVirtualizer()`
    — sunt acceptabile (API-uri externe).

A7. Verifică: `npm run typecheck` → 0 erori. `npm run lint` → 0 erori.
    Commit: "fix: rezolvă erori typecheck + lint rămase din Faza 6"

═══════════════════════════════════════════════════════════════
ETAPA B — Icon-uri PWA + install prompt
═══════════════════════════════════════════════════════════════

B1. Generează 3 PNG-uri în `public/`: `icon-192.png`, `icon-512.png`,
    `icon-maskable-512.png`. Folosește un design simplu: fundal #0B0D10,
    simbol "B" stilizat sau emoji 💰 cu accent emerald (#10b981).
    Cea mai simplă cale: scrie un script Node mic
    (`scripts/generate-icons.mjs`) care generează SVG → PNG cu librăria
    `sharp` dacă există în node_modules; dacă nu, instalează-o ca devDep
    (`npm i -D sharp`) și rulează scriptul.
    Maskable icon are safe zone 80% (pune simbolul într-un cerc/pătrat de
    409px centrat în canvas-ul 512x512).

B2. Component `src/components/features/pwa/install-prompt.tsx`:
    - Listen `beforeinstallprompt` (capture event în state)
    - Banner discreet după 3 sesiuni (counter în localStorage)
    - Pe iOS Safari (`/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream`)
      afișează instrucțiuni "Adaugă la ecran principal" cu pictograma
      Share (icon Lucide `Share`) → "Add to Home Screen"
    - Buton dismiss persistent (localStorage flag `pwa-install-dismissed`)
    - Style: bottom sheet shadcn Sheet, deschis automat dacă criteriile match

B3. Component `src/components/features/pwa/connection-status.tsx`:
    - `useEffect` listen `online`/`offline`
    - Banner sus când offline ("Ești offline. Tranzacțiile vor fi
      sincronizate când revii online.")
    - Toast cu sonner la reconnect ("Sincronizat ✓")

B4. Adaugă ambele component-e în `src/app/(dashboard)/layout.tsx` deasupra
    conținutului (sau în root layout dacă vrei să apară și pe /login).

B5. Rulează `npm run typecheck` și `npm run lint`. Build local cu
    `npm run build` ca să verifici că manifest-ul găsește icon-urile.
    Commit: "feat(pwa): icon-uri + install prompt + connection status"

═══════════════════════════════════════════════════════════════
ETAPA C — FX pipeline complet (BNR + Frankfurter + cron)
═══════════════════════════════════════════════════════════════

C1. Migrație nouă în AMBELE locuri (`src/db/migrations/0006_fx_cron.sql`
    și `supabase/migrations/20260101000006_fx_cron.sql`):
    ```sql
    create table if not exists public.fx_sync_log (
      id uuid primary key default gen_random_uuid(),
      run_at timestamptz not null default now(),
      status text not null check (status in ('ok','partial','failed')),
      currencies_updated int,
      source text,
      error text
    );

    -- Cron: 10:30 UTC weekdays (≈13:30 EET, după BNR publish)
    select cron.schedule(
      'fx-update-daily',
      '30 10 * * 1-5',
      $$
      select net.http_post(
        url := current_setting('app.fx_function_url', true),
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.cron_secret', true),
          'Content-Type', 'application/json'
        )
      );
      $$
    );
    ```

C2. Edge function `supabase/functions/fx-update/index.ts`:
    - Verifică Authorization header == `Bearer ${env.CRON_SECRET}`
    - Fetch `https://www.bnr.ro/nbrfxrates.xml`
    - Parse cu fast-xml-parser
    - Pentru fiecare currency: `rate = Number(value) / Number(multiplier ?? 1)`
    - Upsert în `exchange_rates(rate_date, base='RON', quote, rate, source='BNR')`
    - Salvează și inversele (pentru fiecare quote: INSERT cu `base=quote, quote='RON', rate=1/rate`)
    - Fallback Frankfurter (`https://api.frankfurter.app/latest?from=RON`)
      dacă BNR returnează HTTP non-2xx
    - INSERT în `fx_sync_log`
    - Idempotent: ON CONFLICT (rate_date, base, quote) DO UPDATE

C3. `src/lib/fx.ts` — extinde (server-only ce face fetch, restul shared):
    - `parseBnrRates(xml: string): Array<{ date, currency, rate, multiplier }>`
    - `formatRate(rate: number, decimals = 4): string`
    - Helper-ul deja existent rămâne neatins.

C4. `src/app/api/fx/historical/route.ts` (server-only, POST):
    - Auth check (must be authenticated)
    - Body: `{ year: number }` cu Zod validation, only `currentYear-2..currentYear`
    - Fetch `https://www.bnr.ro/files/xml/years/nbrfxrates{year}.xml`
    - Bulk insert via service-role client (motivat: e o operație administrativă
      one-time la setup; verifică user-ul are admin role în household)
    - Idempotent: ON CONFLICT DO NOTHING

C5. `src/app/(dashboard)/insights/fx/page.tsx`:
    - Selector pereche valutară (default EUR/RON)
    - Recharts LineChart 1Y al cursului
    - Tabel last 30 zile rate-uri
    - "Ultima actualizare: acum X timp" (din `fx_sync_log` ultim row)
    - Comparație BNR vs Frankfurter (dacă diferă > 0.5% pe aceeași dată,
      badge warning)

C6. Verifică triggerul `fn_tx_base_amount` din `0003_triggers.sql`:
    - Dacă `currency = household.base_currency` → `base_amount = amount` ✓
    - Altfel: lookup `fx_at(NEW.currency, household.base_currency, NEW.occurred_on)`
      și set `NEW.base_amount = ROUND(NEW.amount * rate)`. Dacă `fx_at`
      returnează NULL, las `base_amount = NEW.amount` cu un comment LOG.

C7. Commit: "feat(fx): pipeline BNR + Frankfurter fallback + cron + UI insights"

═══════════════════════════════════════════════════════════════
ETAPA D — CSV importer (Faza 6)
═══════════════════════════════════════════════════════════════

D1. `npm i papaparse @types/papaparse`

D2. Creează `src/lib/banking/csv-parsers/`:
    - `types.ts` — `export type ParsedTransaction = { date: string; amount: bigint; currency: string; payee?: string; notes?: string; external_id: string }`
    - `bt24.ts`, `bcr-george.ts`, `ing.ts`, `revolut.ts`, `cec.ts`, `raiffeisen.ts`
    - Fiecare exportă `parse(csv: string): ParsedTransaction[]` și `detect(csv: string): boolean`
    - `index.ts` cu `detectFormat(csv: string): 'bt24'|'bcr'|'ing'|'revolut'|'cec'|'raiffeisen'|'unknown'`
    - Specificități:
      * BT24: separator `;` sau `,`, decimal `.`, dată `DD.MM.YYYY`, charset UTF-8.
        Coloane uzuale: `Data`, `Suma`, `Valuta`, `Detalii tranzacție`.
      * BCR George: separator `;`, decimal `,`, dată `DD/MM/YYYY`. Coloane:
        `Data tranzacției`, `Sumă`, `Detalii`.
      * ING Home'Bank: format multiline quirky — referință parser open-source
        github.com/dvulpe/homebankcsv_parser (re-implementează logica, nu importa).
      * Revolut: standard CSV, dată ISO `YYYY-MM-DD HH:mm:ss`, suport multi-currency
        prin coloana `Currency`.
      * CEC, Raiffeisen: CSV simplu cu separator `;`, decimal `,`.

D3. `src/lib/banking/merchant-matcher.ts`:
    - Tier 1: brand keyword exact (LIDL, KAUFLAND, EMAG, BOLT, UBER, MEGA IMAGE,
      PROFI, PENNY, AUCHAN, CARREFOUR, NETFLIX, SPOTIFY, etc.)
    - Tier 2: legal entity name (DANTE INTERNATIONAL → eMAG, HCL ONLINE
      ADVERTI → Tazz)
    - Tier 3: MCC code dacă e disponibil în CSV (5411 → Mâncare, 5541 → Combustibil)
    - Tier 4: free-text fallback (folosește merchants.normalized_name + pg_trgm)
    - Pentru BT prefix `Plata POS comerciant`, BCR `CUMP. POS`, ING `POS PURCHASE`
      → strip prefix înainte de match
    - Stochează rezultatele în merchants table cu normalized_name pt fuzzy match viitor

D4. `src/app/(dashboard)/import/page.tsx`:
    - Drag-drop area (input type=file accept=".csv")
    - Format detector + override dropdown
    - Preview tabel primele 10 rânduri parsate
    - Mapping coloane → schema (auto-detected)
    - Account selector
    - Buton "Importă X tranzacții"
    - Progress bar la insert

D5. Server action `src/app/(dashboard)/import/actions.ts`:
    - `bulkImport(account_id, transactions[])`:
      * Verifică ownership cont prin RLS
      * Dedup pe `(account_id, external_id)` — UNIQUE constraint deja există
      * Insert în chunks de 100
      * Trigger auto-categorize în background (placeholder pentru Etapa F)
    - Returnează `{ inserted, skipped, errors[] }`

D6. Adaugă link în nav dashboard la /import.
    Commit: "feat(import): CSV parsers BT/BCR/ING/Revolut/CEC/Raiffeisen + UI"

═══════════════════════════════════════════════════════════════
ETAPA E — Invite mamă (Faza 6)
═══════════════════════════════════════════════════════════════

E1. Migrație `0007_invites.sql` (în ambele locuri):
    ```sql
    create table public.household_invites (
      id uuid primary key default gen_random_uuid(),
      household_id uuid not null references public.households(id) on delete cascade,
      invited_email text not null,
      role text not null check (role in ('admin','member','viewer')),
      token text not null unique,
      expires_at timestamptz not null,
      accepted_at timestamptz,
      created_by uuid not null references auth.users(id),
      created_at timestamptz not null default now()
    );
    create index on public.household_invites (household_id);
    create index on public.household_invites (token);

    alter table public.household_invites enable row level security;

    create policy "invites_select_household" on public.household_invites
      for select to authenticated
      using (household_id in (select app.user_household_ids()));

    create policy "invites_insert_owner" on public.household_invites
      for insert to authenticated
      with check (
        exists (
          select 1 from public.household_members hm
          where hm.household_id = household_invites.household_id
            and hm.user_id = auth.uid()
            and hm.role in ('owner','admin')
        )
      );

    create policy "invites_delete_owner" on public.household_invites
      for delete to authenticated
      using (
        exists (
          select 1 from public.household_members hm
          where hm.household_id = household_invites.household_id
            and hm.user_id = auth.uid()
            and hm.role in ('owner','admin')
        )
      );
    ```

E2. Server action `src/app/(dashboard)/settings/members/actions.ts`:
    `inviteMember(householdId, email, role)`:
    - Generează token random 32 bytes (`crypto.randomBytes(32).toString('hex')`)
    - `expires_at = now() + 7 days`
    - INSERT
    - Trimite email via Supabase Auth `signInWithOtp({ email, options: { emailRedirectTo: `${SITE_URL}/invite/${token}` } })` — tip "magicLink to invite" (mama va primi link, va face login, apoi va accepta)
    - Sau dacă ai Resend setat ca SMTP în Supabase, folosește un template custom

E3. `src/app/(auth)/invite/[token]/page.tsx`:
    - Fetch invite by token (server-side)
    - Verifică expires_at și accepted_at IS NULL
    - Dacă user-ul nu e logat → redirect la /login cu `?next=/invite/{token}`
    - Dacă e logat: arată "Mama, alătură-te household-ului '{name}' ca '{role}'?"
      cu butoane Accept / Refuz
    - La Accept: server action care INSERT household_members + UPDATE invite SET accepted_at = now()
    - Redirect la /

E4. `src/app/(dashboard)/settings/page.tsx` — pagină nouă cu tabs:
    - Tab "Membri" (singura pentru acum, restul în Etapa I):
      * Listă membri household curent (avatar + nume + email + rol)
      * Buton "+ Invită membru" → dialog cu email + role select
      * Listă invites pending (cu copy link buton + revoke)

E5. Adaugă link "Setări" în nav dashboard.
    Commit: "feat(household): invite flow pentru membri (mama) + settings/members"

═══════════════════════════════════════════════════════════════
ETAPA F — AI 3-tier categorization + chat + recap (Faza 8)
═══════════════════════════════════════════════════════════════

ATENȚIE: Etapa asta e mare. Dacă vezi că pierzi context, oprește-te
după F6 (categorization complet) și raportează status.

F1. `src/lib/ai/providers.ts` — extinde:
    ```ts
    import "server-only";
    import { createAnthropic } from "@ai-sdk/anthropic";
    import { createOpenAI } from "@ai-sdk/openai";
    import { createGroq } from "@ai-sdk/groq";

    export type AITask = 'embed' | 'parse-fast' | 'categorize-fallback' | 'chat' | 'recap' | 'vision';

    export function getModel(task: AITask) {
      switch (task) {
        case 'embed':
          return createOpenAI({ apiKey: process.env.OPENAI_API_KEY }).embedding('text-embedding-3-small');
        case 'parse-fast':
          return createGroq({ apiKey: process.env.GROQ_API_KEY })('llama-3.3-70b-versatile');
        case 'categorize-fallback':
        case 'chat':
        case 'recap':
          return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })('claude-sonnet-4-6');
        case 'vision':
          return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })('gpt-4o');
      }
    }
    ```
    Păstrează `aiEnv` existent pentru backward compat.

F2. `src/lib/ai/embeddings.ts`:
    - `generateEmbedding(text: string): Promise<number[]>` — `embed` function din 'ai'
    - `generateTransactionEmbedding(tx: { payee?: string; notes?: string; tags?: string[] })`:
      concatenează `[tx.payee, tx.notes, ...(tx.tags ?? [])].filter(Boolean).join(' ')`
    - Batch: `generateEmbeddings(texts: string[])` — `embedMany` din 'ai', batch 100

F3. Migrație `0013_embedding_queue.sql`:
    ```sql
    create table public.embedding_queue (
      id bigserial primary key,
      transaction_id uuid not null references public.transactions(id) on delete cascade,
      enqueued_at timestamptz not null default now(),
      processed_at timestamptz,
      attempts int not null default 0
    );
    create index on public.embedding_queue (processed_at) where processed_at is null;

    create or replace function public.fn_enqueue_embedding()
    returns trigger language plpgsql as $$
    begin
      if new.payee is not null and (
        TG_OP = 'INSERT'
        or new.payee is distinct from old.payee
        or new.notes is distinct from old.notes
      ) then
        insert into public.embedding_queue (transaction_id) values (new.id);
      end if;
      return new;
    end; $$;

    create trigger trg_enqueue_embedding
      after insert or update on public.transactions
      for each row execute function public.fn_enqueue_embedding();

    select cron.schedule('process-embeddings', '*/2 * * * *', $$
      select net.http_post(
        url := current_setting('app.embeddings_function_url', true),
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
        )
      );
    $$);
    ```

F4. Edge function `supabase/functions/process-embeddings/index.ts`:
    - Auth check
    - Fetch top 100 din embedding_queue WHERE processed_at IS NULL
    - Pentru fiecare: generează embedding via OpenAI batch
    - UPDATE transactions SET embedding = ... WHERE id IN (...)
    - UPDATE embedding_queue SET processed_at = now()
    - Increment attempts pe failure, drop după 5 attempts

F5. `src/lib/ai/categorize.ts`:
    ```ts
    import "server-only";
    import { generateObject } from "ai";
    import { z } from "zod";
    import { getModel } from "./providers";
    import { generateTransactionEmbedding } from "./embeddings";

    type Tx = { payee?: string; amount: bigint; currency: string; account_id: string; notes?: string };

    export async function categorize(tx: Tx, householdId: string, supabase: any) {
      // Tier 1: Rules
      const { data: rules } = await supabase
        .from('rules')
        .select('*')
        .eq('household_id', householdId)
        .eq('is_active', true)
        .order('priority', { ascending: true });
      for (const rule of rules ?? []) {
        if (matchRule(rule, tx)) {
          return { category_id: rule.set_category_id, confidence: 1.0, source: 'rule' as const };
        }
      }
      // Tier 2: Embedding KNN
      const emb = await generateTransactionEmbedding(tx);
      const { data: neighbors } = await supabase.rpc('match_transactions', {
        _household: householdId,
        _query_embedding: emb,
        _limit: 10
      });
      const filtered = (neighbors ?? []).filter((n: any) => n.similarity > 0.85 && n.category_id);
      if (filtered.length >= 3) {
        const counts = new Map<string, number>();
        for (const n of filtered) counts.set(n.category_id, (counts.get(n.category_id) ?? 0) + 1);
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
        const avgSim = filtered.reduce((s: number, n: any) => s + n.similarity, 0) / filtered.length;
        return { category_id: top[0], confidence: avgSim, source: 'knn' as const };
      }
      // Tier 3: LLM
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, type')
        .eq('household_id', householdId)
        .is('archived_at', null);
      const { object } = await generateObject({
        model: getModel('categorize-fallback'),
        schema: z.object({ category_id: z.string().uuid().nullable(), confidence: z.number().min(0).max(1) }),
        prompt: `Categorizează tranzacția: payee="${tx.payee}", amount=${tx.amount} ${tx.currency}.\nCategorii disponibile: ${JSON.stringify(cats)}.\nReturnează JSON.`,
        temperature: 0
      });
      return { ...object, source: 'llm' as const };
    }

    function matchRule(rule: any, tx: Tx): boolean {
      if (rule.match_payee_regex && tx.payee) {
        try { if (!new RegExp(rule.match_payee_regex, 'i').test(tx.payee)) return false; }
        catch { return false; }
      }
      if (rule.match_account_id && rule.match_account_id !== tx.account_id) return false;
      if (rule.match_currency && rule.match_currency !== tx.currency) return false;
      if (rule.match_min_amount != null && tx.amount < rule.match_min_amount) return false;
      if (rule.match_max_amount != null && tx.amount > rule.match_max_amount) return false;
      return true;
    }
    ```

F6. Hook auto-categorize: în `src/app/(dashboard)/transactions/actions.ts`,
    când `createTransaction` returnează cu `category_id IS NULL`, push la
    embedding_queue (deja face triggerul) și apoi un fire-and-forget la
    `categorize()` care face UPDATE pe tx.

F7. UI rule extraction: în `transaction-detail.tsx`, când user-ul schimbă
    category_id manual, după save afișează toast cu acțiune:
    "Crează regulă: toate de la {payee} → {newCategory}?" cu buton Da
    care apelează server action `createRuleFromCorrection`.

F8. (Pauză verificare) `npm run typecheck` + `npm run lint` + `npm run build`.
    Commit: "feat(ai): 3-tier categorization (rules → KNN → LLM)"

F9. Migrație `0014_chat.sql`:
    ```sql
    create table public.chat_threads (
      id uuid primary key default gen_random_uuid(),
      household_id uuid not null references public.households(id) on delete cascade,
      user_id uuid not null references auth.users(id) on delete cascade,
      title text,
      created_at timestamptz not null default now()
    );
    create index on public.chat_threads (household_id, created_at desc);

    create table public.chat_messages (
      id uuid primary key default gen_random_uuid(),
      thread_id uuid not null references public.chat_threads(id) on delete cascade,
      role text not null check (role in ('user','assistant','tool')),
      content text,
      tool_calls jsonb,
      embedding vector(1536),
      created_at timestamptz not null default now()
    );
    create index on public.chat_messages (thread_id, created_at);
    create index on public.chat_messages using hnsw (embedding vector_cosine_ops);

    alter table public.chat_threads enable row level security;
    alter table public.chat_messages enable row level security;

    create policy "chat_threads_select_own" on public.chat_threads
      for select to authenticated using (user_id = auth.uid());
    create policy "chat_threads_insert_own" on public.chat_threads
      for insert to authenticated with check (user_id = auth.uid());
    create policy "chat_threads_delete_own" on public.chat_threads
      for delete to authenticated using (user_id = auth.uid());

    create policy "chat_messages_select_own" on public.chat_messages
      for select to authenticated
      using (thread_id in (select id from public.chat_threads where user_id = auth.uid()));
    create policy "chat_messages_insert_own" on public.chat_messages
      for insert to authenticated
      with check (thread_id in (select id from public.chat_threads where user_id = auth.uid()));
    ```

F10. `src/lib/ai/tools.ts` — implementează tool-urile reale cu Vercel AI SDK 6:
     - `query_transactions`: SQL query cu filtrele (date range, category, payee, amount, limit)
     - `get_budget`: pe luna curentă sau dată
     - `get_net_worth`: SUM(accounts.current_balance convertit la base)
     - `get_goal_progress`: per goal
     - `simulate_scenario`: compound interest engine PUR — `(monthly * 12 * years * (1 + 0.04) ** years)`. NO LLM aici.
     - `update_transaction`: doar dacă tx aparține household-ului user-ului
     - `set_goal`: similar
     - `semantic_search`: prin `match_transactions` RPC + embedding query
     Toate cu Zod schemas pentru parameters și execute care folosește
     supabase client cu RLS (NU service-role).

F11. `src/lib/ai/prompts.ts`:
     ```ts
     import "server-only";
     export const SYSTEM_PROMPT_RO = `
     Ești asistentul financiar al lui {{user_name}}. Vorbești română colocvială,
     prietenoasă, niciodată jargon.

     REGULI DURE:
     - NU INVENTA NUMERE. Pentru ORICE afirmație factuală despre bani, folosește un tool.
     - Răspunde în propoziții scurte, max 3.
     - Dacă user-ul cere o sumă, calculează prin tool, NU estima.
     - Format sume: "1.234,50 lei" cu virgulă decimală.
     - Pentru date: "24 aprilie", "marțea trecută", nu ISO.
     - Dacă nu ești sigur, spune "lasă-mă să verific" și folosește un tool.
     - Tonul: prieten care înțelege bani, nu consultant financiar.
     `.trim();
     ```

F12. `src/app/api/ai/chat/route.ts`:
     ```ts
     import "server-only";
     import { streamText } from "ai";
     import { getModel } from "@/lib/ai/providers";
     import { tools } from "@/lib/ai/tools";
     import { SYSTEM_PROMPT_RO } from "@/lib/ai/prompts";
     import { createClient } from "@/lib/supabase/server";

     export async function POST(req: Request) {
       const { messages, threadId } = await req.json();
       const supabase = await createClient();
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return new Response('Unauthorized', { status: 401 });

       // Memory RAG: embed last user message, fetch top 3 similar past messages
       // (skip pentru first message)

       const result = streamText({
         model: getModel('chat'),
         system: SYSTEM_PROMPT_RO.replace('{{user_name}}', user.email ?? 'prietene'),
         messages,
         tools: tools(supabase, user.id),
         toolChoice: 'auto',
         maxSteps: 5,
         temperature: 0.3,
         onFinish: async ({ text, toolCalls, toolResults }) => {
           // Persist messages to chat_messages with embedding
         }
       });
       return result.toDataStreamResponse();
     }
     ```

F13. `src/app/(dashboard)/ai/page.tsx`:
     - `useChat` din `@ai-sdk/react`
     - Listă mesaje cu tool invocations vizibile (collapsible)
     - Input la bottom cu Enter to submit
     - Suggestions chips deasupra input: "Cât am cheltuit la mâncare luna asta?",
       "Ce abonamente avem?", "Cât am economisit anul ăsta?"
     - Voice input button (refoloseste WebSpeech din Quick-add)

F14. Cmd+K palette `src/components/features/ai/command-palette.tsx`:
     - shadcn Command (cmdk deja instalat)
     - Trigger Cmd/Ctrl+K global (în layout root)
     - Tabs: "Acțiuni rapide" (links), "Caută" (semantic search), "Întreabă AI"
     - Pe Mac respect Cmd, pe Windows Ctrl

F15. Edge function `supabase/functions/weekly-recap/index.ts`:
     - Auth check
     - Cron luni 8:00 EET (`0 6 * * 1` UTC) per household
     - Aggregations: top 3 categorii, biggest expense, savings rate, vs prev week
     - Prompt Claude pentru 4 bullets warm RO
     - INSERT într-o tabelă nouă `recaps` (creează migrație 0015)
     - Push notification (după Etapa G — momentan doar INSERT)
     - User vede recap-ul ca card pe dashboard luni-marți

F16. `src/lib/ai/anomaly.ts`:
     - Statistical baseline: pentru fiecare categorie, calc median și stdev
       pe ultimele 90 zile
     - Trigger când o tx > median + 2*stdev SAU > 3x median
     - LLM phrasing prin Groq (cheap): "De ce e asta neobișnuit?"
     - Returnează `{ isAnomaly, reason, severity }`

F17. `src/lib/ai/subscriptions.ts`:
     - Algoritm median-gap: pentru fiecare merchant, găsește gaps între tranzacții
     - Dacă median(gaps) e ~30 zile (±5 zile) și ≥3 ocurrențe și amount stable
       (±5%) → e subscription
     - Salvează în recurring_transactions cu `auto_detected = true` (adaugă
       coloana în migrația 0015)

F18. Pagină `src/app/(dashboard)/subscriptions/page.tsx`:
     - Listă recurring_transactions cu auto_detected = true
     - Total monthly cost (RON)
     - Price-hike alerts (dacă ultima sumă > median*1.1)
     - Link la cancel guidelines (placeholder text)

F19. Commit-uri logice (3-4 commit-uri pe această etapă, una per sub-domeniu:
     embeddings, categorize, chat, recap+anomaly+subscriptions).

═══════════════════════════════════════════════════════════════
ETAPA G — Push + offline queue (Faza 9 PWA)
═══════════════════════════════════════════════════════════════

G1. `npm i web-push @types/web-push idb`

G2. `src/lib/offline/queue.ts`:
    - idb wrapper pentru IndexedDB
    - Schema: `pending_transactions`, `pending_updates`, `pending_deletes`
    - `enqueue(action, payload)`, `drain()`, `count()`
    - On insert offline: salvează local, returnează optimistic ID, queue în IDB
    - On reconnect (`online` event sau Background Sync API):
      `drain()` apelează server actions
    - Conflict resolution: last-write-wins

G3. `src/lib/push/send.ts` (server-only):
    ```ts
    import "server-only";
    import webpush from "web-push";

    webpush.setVapidDetails(
      'mailto:andrei@example.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    export async function sendPush(userId: string, payload: { title: string; body: string; url?: string }) {
      // Fetch all subscriptions for user
      // Send to each, drop expired (HTTP 410)
    }
    ```

G4. `src/app/api/push/subscribe/route.ts`:
    - POST: salvează subscription în `push_subscriptions`
    - DELETE: șterge subscription

G5. Component `src/components/features/pwa/notification-permission.tsx`:
    - Doar după PWA installed (verifică `display-mode: standalone`)
       SAU > 5 acțiuni efectuate (counter localStorage)
    - Buton "Activează notificări"
    - La accept: `navigator.serviceWorker.ready → pushManager.subscribe`
       cu VAPID public key, POST la /api/push/subscribe

G6. Extinde `src/app/sw.ts`:
    ```ts
    self.addEventListener('push', (event: any) => {
      const data = event.data?.json();
      event.waitUntil(
        self.registration.showNotification(data.title, {
          body: data.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: { url: data.url ?? '/' }
        })
      );
    });
    self.addEventListener('notificationclick', (event: any) => {
      event.notification.close();
      event.waitUntil(self.clients.openWindow(event.notification.data.url));
    });
    ```

G7. Triggers server-side (în Edge Functions sau API routes):
    - Bill reminder: cron zilnic, 1 zi înainte de tx scheduled → sendPush
    - Anomaly: în categorize hook, dacă anomaly.ts detectează → sendPush
    - Goal milestone: 25%, 50%, 75%, 100% → sendPush
    - Weekly recap: în weekly-recap function, după INSERT → sendPush
    - Low balance: cron zilnic, dacă cashflow forecast < 500 lei → sendPush

G8. Notification preferences în Settings:
    `src/app/(dashboard)/settings/notifications/page.tsx`:
    - Per category: bills, anomalies, goals, weekly recap, low balance
    - Push / email / in-app toggles (momentan doar push)
    - Quiet hours (start, end)

G9. `npm run typecheck` + `npm run lint` + `npm run build`.
    Commit: "feat(pwa): push notifications + offline queue + preferences"

═══════════════════════════════════════════════════════════════
ETAPA H — Enable Banking (Faza 9)
═══════════════════════════════════════════════════════════════

H1. `npm i jose`

H2. `src/lib/enable-banking/client.ts` (server-only):
    - JWT RS256 signing cu `ENABLE_BANKING_PRIVATE_KEY` via jose
    - Methods:
      * `startAuth(institution_id, redirect_url)` → returnează URL SCA
      * `createSession(auth_code)` → 180-day session
      * `getAccounts(session_id)`
      * `getBalances(account_uid)`
      * `getTransactions(account_uid, from, to)`
    - Rate limit: max 4/zi/cont (folosește lib/rate-limit.ts)
    - Endpoint base: `https://api.enablebanking.com`

H3. `src/app/api/banking/start-auth/route.ts`:
    - POST cu `{ institution_id }`
    - Apelează startAuth, returnează URL pentru redirect

H4. `src/app/api/banking/callback/route.ts`:
    - GET cu query `?code=...&state=...`
    - createSession, INSERT bank_connections
    - Redirect la /connections cu toast success

H5. `src/app/(dashboard)/connections/page.tsx`:
    - Listă bank_connections cu status badges:
      * Activ (verde)
      * Expiră curând (galben, < 30 zile)
      * Expirat (roșu) cu CTA "Reautentifică"
    - Buton "+ Conectează bancă" → modal listă instituții (BT, BCR, ING,
      Revolut, Raiffeisen, UniCredit, CEC, BRD)
    - Click instituție → /api/banking/start-auth → redirect SCA

H6. Migrație `0016_bank_sync_fields.sql`:
    Adaugă coloane în `bank_connections` dacă lipsesc: `last_sync_status`,
    `last_sync_error`, `last_sync_count`.

H7. Edge function `supabase/functions/bank-sync/index.ts`:
    - Auth check
    - Cron 6h (`0 */6 * * *` UTC)
    - Pentru fiecare bank_connection active:
      * getTransactions de la `last_synced_at - 3 zile` (overlap pentru safety)
      * Map la transactions schema (folosind `merchant-matcher.ts` din Etapa D)
        - amount în minor units
        - external_id = bookingId / endToEndId
        - merchant: parse din remittanceInformationUnstructured
        - Pentru BT: detect "Plata POS comerciant" prefix, etc.
      * Insert cu `source='bank_sync'`, skip dacă external_id există deja
        (UNIQUE constraint)
      * Trigger auto-categorize pe inserate
    - Update `last_synced_at`, `last_sync_status`

H8. Setări reauth: cron zilnic verifică expires_at. Dacă < 7 zile, push
    notification "Conexiunea cu BT expiră în 5 zile. Reautentifică."

H9. Commit: "feat(banking): integrare Enable Banking + sync 6h + reauth alerts"

═══════════════════════════════════════════════════════════════
ETAPA I — Romanian polish (Faza 10)
═══════════════════════════════════════════════════════════════

I1. `src/lib/text/diacritics.ts`:
    - `normalizeRomanian(s: string)`: convertește ş→ș, ţ→ț (cedilla legacy → comma below)
    - `removeDiacritics(s: string)`: pentru search fuzzy
    - Asigură UI strings sunt comma-below correct (ș, ț, NU ş, ţ) — grep recursiv
    și fix.

I2. Tichete masă:
    - `src/lib/meal-vouchers/providers.ts`: lista provideri (Edenred, Pluxee,
      Up Romania) + BIN-uri card + merchant patterns ("EDENRED", "PLUXEE",
      "UP ROMANIA")
    - În bank-sync și csv-import, dacă merchant match meal voucher provider
      → flag tx ca top-up tichete, update meal_voucher account balance
    - Auto-detect spending: dacă POS receipt MCC 5411 (grocery) și card BIN
      tichete → categorize ca "Mâncare (tichete)"
    - Component `src/components/features/accounts/meal-voucher-card.tsx`:
      * Hero balance curent
      * Sub-text: "Expiră în X luni: Y lei"
      * Lista lots (top-up date + amount + days_until_expiry, warning < 30 zile)
      * Insight: "Cheltuiește X lei/săptămână în medie"
    - Migrație `0017_meal_voucher_lots.sql`: tabel `meal_voucher_lots
      (id, account_id, top_up_date, amount, expires_on)`

I3. Pilon III tracker:
    - Migrație `0018_pension_pillar3.sql`:
      ```sql
      create table public.pension_contributions (
        id uuid primary key default gen_random_uuid(),
        household_id uuid not null references public.households(id) on delete cascade,
        user_id uuid references auth.users(id),
        provider text,
        contribution_date date not null,
        amount_eur numeric(12,2) not null,
        amount_ron bigint,
        deductible boolean not null default true,
        year int generated always as (extract(year from contribution_date)::int) stored,
        created_at timestamptz not null default now()
      );
      ```
    - `src/app/(dashboard)/pension/page.tsx`:
      * Card per an cu progress bar față de cap-ul de 400 EUR/an
      * "Mai poți deduce X EUR (≈ Y lei la curs azi)" cu fx_at()
      * CTA "+ Adaugă contribuție"
    - Reminder cron: la 1 octombrie, dacă < 400 EUR contribuit → push

I4. Salary intelligence:
    - Migrație `0019_income_streams.sql`:
      ```sql
      create table public.income_streams (
        id uuid primary key default gen_random_uuid(),
        user_id uuid references auth.users(id),
        household_id uuid references public.households(id),
        name text,
        payer text,
        expected_amount bigint,
        expected_day_of_month int,
        day_variance int,
        confidence numeric(3,2),
        created_at timestamptz default now()
      );
      ```
    - `src/lib/intelligence/salary-detection.ts`:
      * Algoritm: scan ultimele 12 luni
      * Find deposits recurrente (>1500 lei, intervale ~30 zile, payer stabil)
      * Detect mama: pension delivery via Poșta Română (first 2 weeks of month,
        descrieri standard "PENSIE", "CASA NATIONALA DE PENSII")
      * Salvează în income_streams cu confidence score
    - Dashboard widget: countdown "Salariu peste 4 zile"

I5. Seasonal sub-budgets:
    - `src/lib/seasonal/budgets.ts`:
      * Catalog: Crăciun (1 nov–7 ian), Paște (30 zile înainte de Paștele
        Ortodox calculat cu Computus), Black Friday RO (prima vineri din
        noiembrie ± 5 zile), Mărțișor (25 feb–8 mar), Vacanța vară (1 iun–31 aug)
      * Auto-prompt 1 lună înainte: "Crăciunul vine. Setezi un buget?"
      * Crează un goal cu tag #season_christmas_2026 + envelope buget separat
      * Dashboard widget seasonal-aware

I6. Romanian holidays:
    - `src/lib/holidays/ro.ts`:
      * Listă fixă: 1, 2 ianuarie, 24 ianuarie, 1 mai, 1 iunie, 15 august,
        30 noiembrie, 1, 8 decembrie, 25, 26 decembrie
      * Calculate: Vinerea Mare, Paștele, A 2-a zi Paște, Rusalii, A 2-a zi
        (algoritm Computus pentru calendarul ortodox)
      * `isHoliday(date)`, `nextHoliday()`
    - Skip cron BNR pe holidays
    - Widget "Sărbătoare în 3 zile: Paște"

I7. Cashflow forecast:
    - `src/lib/forecast/cashflow.ts`:
      * 30/60/90 zile proiecție
      * Inputs: income_streams + recurring_transactions + scheduled tx
        + regression-based discretionary projection (linear pe ultimele 6 luni)
      * Output: per-day projected balance + low-balance alerts
    - Dashboard widget chart cu shaded confidence band
    - Notif push dacă projected balance < 500 lei la oricare zi în următoarele 14

I8. Rage spending:
    - `src/lib/intelligence/rage-spending.ts`:
      * Detect ≥3 tx în <30 min din aceeași categorie discretionary
    - Trigger card non-judgmental pe dashboard: "Ai cheltuit X lei la
      Cumpărături în 20 minute. Ești OK?"
    - Toggle în settings (default ON)

I9. Lifestyle inflation:
    - `src/lib/intelligence/lifestyle-inflation.ts`:
      * Pentru fiecare categorie discretionary, rolling 12-month trend
      * Dacă creștere YoY > 15%: warning lunar
    - "Cheltuielile pe Restaurante au crescut cu 23% față de anul trecut"

I10. Spending anniversaries:
     - Cron lunar: găsește tranzacții cu amount > 100 lei din exact 1 an /
       5 ani în urmă
     - Push: "Acum un an, cina la Caru' cu Bere — 200 lei"
     - Card pe dashboard "Pe vremea asta..."

I11. Settings page extinsă cu 6 grupuri:
     - Profil (name, avatar, email)
     - Preferințe (base_currency, locale, timezone, first-day-of-week,
       start-of-month)
     - Aspect (theme light/dark/system, accent color, number format)
     - Accesibilitate (larger text, high contrast, +/- în loc de culoare,
       reduce motion)
     - Categorii (link)
     - Conexiuni (link)
     - Notificări (link)
     - Membri (deja făcut în Etapa E)
     - Export (CSV/JSON/PDF al household-ului)

I12. Commit-uri logice per sub-domeniu (5-6 commits pe etapa I).

═══════════════════════════════════════════════════════════════
ETAPA J — Verificare finală
═══════════════════════════════════════════════════════════════

J1. `npm run typecheck` — 0 erori
J2. `npm run lint` — 0 erori, warnings doar pe react-compiler
    incompatible-library acceptabile
J3. `npm run build` — succes
J4. Verifică Lighthouse local cu `npx serve out` sau live preview Vercel:
    PWA score 100, a11y > 95, perf mobile > 85
J5. Update CLAUDE.md secțiunea 5 — marchează fazele 6-12 ca complete
J6. Commit final: "chore: MVP complet conform BLUEPRINT secțiunea 11"
J7. Raportează un rezumat în chat: ce ai făcut pe etape, eventuale decizii
    pe care le-ai luat, și ce a mai rămas (probabil V2/V3 features din
    BLUEPRINT secțiunea 11: pasi-uri optimization, geo-tagged spending,
    weather correlation, MCP server, etc.).
```
