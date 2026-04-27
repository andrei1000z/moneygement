# EXTERN_CHECKLIST.md — ce faci TU, în afara codului

> Stadiul actual: **MVP funcțional COMPLET (18 commits)**, lipsește doar designul.
> După Claude Code rulează `DESIGN_PROMPT.md`, urmezi pașii de mai jos pentru
> a duce app-ul live.

---

## ✅ Stare actuală verificată (27 apr 2026)

- `npm run typecheck` → 0 erori
- `npm run lint` → 0 erori (4 warnings acceptabile pe react-compiler)
- `npm run build` → fail pe Windows (VirtualAlloc — bug Next 16 pe Windows, NU în cod)
- 18 commits Git, toate fazele BLUEPRINT 0-12 închise
- 19 migrații în `supabase/migrations/`
- Folder-ul `src/lib/` are 13 sub-domenii organizate

**Singurul lucru tehnic care lipsește serios:** designul iOS Liquid Glass.
Acela e în `DESIGN_PROMPT.md`.

---

## 🚀 Pași externi — în ordine

### 0. Înainte de tot — checkpoint git

```bash
cd C:\Users\Andrei\Desktop\banii
git status
# dacă ai modificări nepuse:
git add . && git commit -m "checkpoint: pre-design"
git checkout -b design/liquid-glass
```

### 1. Aplică migrațiile pe Supabase (dacă încă nu sunt)

```bash
npx supabase link --project-ref ioqdwekozpcmwswhgwiv
npx supabase db push
npm run db:types
```

### 2. Setări la nivel de DB pentru cron-uri

În Supabase Dashboard → SQL Editor → New query, rulează:

```bash
# Local, generează 2 hex-uri (rulezi de 2 ori):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Apoi în SQL Editor (înlocuiește `<hex_1>` și `<hex_2>` cu valorile reale):

```sql
alter database postgres set "app.cron_secret" to '<hex_1>';
alter database postgres set "app.iban_encryption_key" to '<hex_2>';
alter database postgres set "app.fx_function_url" to 'https://ioqdwekozpcmwswhgwiv.supabase.co/functions/v1/fx-update';
alter database postgres set "app.embeddings_function_url" to 'https://ioqdwekozpcmwswhgwiv.supabase.co/functions/v1/process-embeddings';
alter database postgres set "app.recap_function_url" to 'https://ioqdwekozpcmwswhgwiv.supabase.co/functions/v1/weekly-recap';
alter database postgres set "app.bank_sync_function_url" to 'https://ioqdwekozpcmwswhgwiv.supabase.co/functions/v1/bank-sync';
```

Verifică: `select current_setting('app.cron_secret', true);` → trebuie să întoarcă hex-ul.

### 3. Activează extensions Supabase (dacă nu sunt deja active)

În Supabase Dashboard → Database → Extensions, activează:
- `pgcrypto` (pentru IBAN encrypt)
- `vector` (pgvector pentru embeddings)
- `pg_trgm` (fuzzy search merchants)
- `pg_cron` (cron jobs)
- `pg_net` (HTTP din SQL pentru cron)

### 4. Storage bucket "receipts"

Supabase Dashboard → Storage → New bucket:
- Name: `receipts`
- Public: **NU** (privat)
- File size limit: 5 MB
- Allowed MIME types: `image/jpeg, image/png, image/webp, image/heic`

### 5. Auth Site URL + Redirect URLs

Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://banii-andrei.vercel.app` (sau alt URL Vercel când îl ai)
- Redirect URLs: adaugă pe rând:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/invite/**`
  - `https://banii-andrei.vercel.app/auth/callback`
  - `https://banii-andrei.vercel.app/invite/**`

### 6. Deploy Edge Functions Supabase

Verifică că ai folder-ul `supabase/functions/` cu sub-foldere pentru fiecare edge function. Dacă nu există, Claude Code le va crea în prompt-ul de design (nu, nu le creează — dacă lipsesc, dă-i un task separat: "creează edge functions pentru fx-update, process-embeddings, weekly-recap, bank-sync conform migrațiilor 0006/0008/0009/0020").

Pentru fiecare funcție existentă:

```bash
# Login Supabase CLI dacă nu l-ai făcut:
npx supabase login

# Deploy:
npx supabase functions deploy fx-update --project-ref ioqdwekozpcmwswhgwiv
npx supabase functions deploy process-embeddings --project-ref ioqdwekozpcmwswhgwiv
npx supabase functions deploy weekly-recap --project-ref ioqdwekozpcmwswhgwiv
npx supabase functions deploy bank-sync --project-ref ioqdwekozpcmwswhgwiv
```

Pentru fiecare, pune secretele:
```bash
npx supabase secrets set OPENAI_API_KEY=sk-... ANTHROPIC_API_KEY=sk-ant-... GROQ_API_KEY=gsk_... CRON_SECRET=<hex_1_din_pasul_2>
```

### 7. Deploy pe Vercel

```bash
npm i -g vercel
cd C:\Users\Andrei\Desktop\banii
vercel
```

Urmează prompt-urile (login, link la project nou). După prima deploy:

```bash
vercel --prod
```

Apoi în Vercel Dashboard → Project → Settings → Environment Variables, adaugă TOATE variabilele din `.env.local` (toate 3 environments: Production, Preview, Development).

### 8. Update Supabase URL Configuration

Acum că ai URL-ul Vercel real, înlocuiește în Supabase Dashboard → Authentication → URL Configuration:
- Site URL = URL-ul real Vercel (ex: `https://banii-i7s8w3e2c.vercel.app`)
- Adaugă în Redirect URLs și `https://<URL_REAL>.vercel.app/auth/callback`

### 9. Test pe telefon

- **Android Chrome**: deschide URL-ul Vercel → meniu (3 puncte) → "Adaugă la ecranul principal"
- **iOS Safari**: deschide URL → buton Share → "Add to Home Screen"
- Open app, verifică:
  - Login cu magic link merge
  - Dashboard se încarcă cu Aurora background vizibil
  - Quick-add sheet se deschide cu animație spring
  - Push notifications: după 5 acțiuni, prompt apare; activează → primești notificare test

### 10. Setup Enable Banking (opțional, dacă vrei sync auto bănci)

1. Cont la `https://enablebanking.com` → register app
2. Generează RSA keypair local:
   ```bash
   openssl genrsa -out private.pem 2048
   openssl rsa -in private.pem -pubout -out public.pem
   ```
3. Upload `public.pem` în Enable Banking dashboard
4. Pune `private.pem` content în Vercel env `ENABLE_BANKING_PRIVATE_KEY` (cu `\n` real, nu literal)
5. App trece în "active in restricted mode" după ce conectezi primele conturi (BT și Revolut tale)

### 11. Invită mama

În app:
- Settings → Membri → Invită membru → introduceți email-ul ei
- Mama primește email cu magic link
- Click link → ajunge pe `/invite/<token>` → acceptă → are acces

---

## ⚠️ Probleme cunoscute

**Build local pe Windows pică** cu `VirtualAlloc failed` la `Collecting page data`.
Cauza: Next.js 16 + React 19 + Windows nu se înțeleg pe memorie. Soluții:
- A. Build-uiește pe Vercel direct (cea mai simplă) ✅ recomandată
- B. WSL2 (Linux pe Windows) → `npm run build` merge
- C. Crește memorie virtuală Windows: Settings → System → About → Advanced → Performance Settings → Advanced → Virtual memory → Custom 16384 MB
- D. Flag `NODE_OPTIONS="--max-old-space-size=4096"` (rar ajută la asta)

`npm run dev` cu Turbopack merge bine pe Windows — folosește pentru testare locală.

---

## 📝 Ce să faci după ce designul e gata

1. Test toate paginile pe mobile + desktop
2. Push pe Vercel preview
3. Cere mamei să încerce — feedback de UX
4. Iterează bazat pe feedback
5. Merge `design/liquid-glass` → `main`
6. Productize: domain custom (banii.ro? andrei.ro/banii?), favicon final, OG image

---

## Resurse utile

- **maskable.app/editor** — verifică maskable icon arată decent pe Android
- **lighthouse** — `npx lighthouse https://<vercel_url>` pentru perf/a11y/PWA score
- **vercel.com/dashboard** — logs, analytics, env vars
- **supabase.com/dashboard/project/ioqdwekozpcmwswhgwiv** — DB, auth, functions, storage
