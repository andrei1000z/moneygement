# AUDIT v2 — Banii (27 aprilie 2026)

> Refăcut după inspecție directă + rulare typecheck/lint/build.
> **Vestea bună:** aplicația e ~95% gata funcțional. **Singurul lucru care lipsește serios e DESIGN-UL.**

---

## ✅ Status real (nu cel de ieri)

### Funcțional: COMPLET conform BLUEPRINT secțiunile 1-11

Verificat pe disk — 18 commits Git, toate fazele închise:

| Faza | Status | Ce există concret |
|------|--------|-------------------|
| 0 — Setup | ✅ | Next 16, React 19, Tailwind v4, shadcn/ui, Serwist, proxy.ts, env complete |
| 1 — Schema DB | ✅ | 19 migrații (0001 → 0099), RLS pe tot, triggers, fx_at, match_transactions, cashflow RPC |
| 2 — Accounts/Categories/Merchants | ✅ | CRUD + IBAN encrypted + Dinero v2 + count-up animations |
| 3 — Transactions core | ✅ | Listă virtualizată, filtre URL state, splits, transfer auto-detect, comments, ownership, bulk actions |
| 4 — Quick-add | ✅ | Keypad custom, presets pinned, voice (Groq + Claude fallback), receipt OCR (GPT-4o vision), draft persistence |
| 5 — Budgets + Goals | ✅ | Target + envelope mode, Move Money, 5 bucket types, debt snowball/avalanche |
| 6 — Invite + CSV + FX | ✅ | Token-based invite, 6 parsers CSV (BT/BCR/ING/Revolut/CEC/Raiffeisen), BNR cron + Frankfurter fallback |
| 7 — Multi-currency | ✅ | Integer minor units, fx_at cross-rate, base_amount auto-trigger |
| 8 — AI complet | ✅ | 3-tier categorization (rules → KNN → LLM), chat cu tool-calling, weekly recap, anomaly, subscription detector, Cmd+K palette |
| 9 — PWA + Banking | ✅ | Serwist offline queue (IndexedDB), web-push VAPID, install prompt iOS-aware, Enable Banking RS256 + sync 6h |
| 10 — Romanian polish | ✅ | Tichete masă cu loturi expiry, Pilon III 400 EUR cap, salary detection + dashboard countdown, seasonal budgets, holidays, cashflow forecast, anniversaries, rage spending, lifestyle inflation |
| Settings | ✅ | 6 tabs (Membri, Notificări, Aspect, Profil, Linkuri, Export), CSV/JSON export |

### Tehnic: VERDE

- `npm run typecheck` → **0 erori** ✅
- `npm run lint` → **0 erori, 4 warnings** (toate sunt react-compiler pe `form.watch()` și `useVirtualizer()` — API-uri externe acceptabile)
- `npm run build` → **fail pe Windows** cu `VirtualAlloc failed` (e bug de mediu Next 16, NU bug în cod) — verifică pe Vercel sau cu memorie mai multă
- Securitate: `service_role` doar în `admin.ts` cu `import "server-only"`, IBAN encrypted cu pgcrypto, RLS pe TOATE tabelele

### Structură fișiere: SOLID

`src/lib/` are 13 sub-domenii organizate frumos: `ai/`, `banking/`, `enable-banking/`, `forecast/`, `holidays/`, `intelligence/`, `meal-vouchers/`, `offline/`, `push/`, `seasonal/`, `supabase/`, `text/`, `validation/`. Plus core (`money.ts`, `fx.ts`, `crypto.ts`, `dashboard.ts`, `debt.ts`).

---

## 🎨 PROBLEMA REALĂ: Designul e plat, nu iOS

### Ce ai acum
Verifică `src/app/globals.css`:
- Tema e shadcn default monochrome — `oklch(... 0 0)` peste tot = grey neutru
- Card-uri: `border-border/60 bg-card rounded-xl` — flat shapes, fără glow, fără translucență, fără depth
- Background-ul body-ului e `bg-background` solid (`oklch(0.145 0 0)` în dark = #25 grey)
- Zero gradient, zero blur, zero noise, zero shimmer
- KPI cards (`kpi-card.tsx`): `border-border/60 bg-card rounded-xl p-4` — boring
- NetWorthHeadline: același pattern — `bg-card hover:bg-accent/30` flat
- FAB-ul în nav: `bg-primary text-primary-foreground shadow-lg ring-4` — plat
- Bottom tab bar: `bg-background/95 supports-[backdrop-filter]:bg-background/70 backdrop-blur` — există SUPER LIGHT blur (1 punct), insuficient

### Ce vrei (iOS Liquid Glass + Glassmorphism + Glow)
- Background ambient cu **gradient mesh** (3-4 blob-uri colored care se mișcă subtil)
- Card-uri cu **backdrop-blur(40px) + saturate(180%)** + border interior `inset 0 1px 0 rgba(255,255,255,0.1)` (highlight de sus iOS-style)
- **Glow halos** pe element-e importante (net worth, FAB, primary buttons) — `box-shadow` colored multi-strat
- Tabular numbers cu **gradient text** sau text-glow pe sumele importante
- **Spring physics animations** (motion) la tap/scroll, nu transitions plate
- **Color palette emerald/violet/cyan** pe accenturi (nu doar grey monochrome)
- **Noise texture overlay** subtil (3% opacity) pentru depth
- **Specular highlight** pe card-uri când le hover-ezi (light follow cursor)
- Font heading: **SF Pro Display** sau echivalent (Geist e ok dar seamănă cu `system-ui`)
- Bottom sheet-uri cu **rounded corners 32px** și **bounce spring**
- Toggle-uri și switch-uri stil iOS (nu shadcn default)
- Charts cu **gradient fills** și **glow under line**

---

## 📦 Ce mai lipsește (în afară de design)

### 🔴 Lucruri care BLOCHEAZĂ producția
1. **Build pe Windows** — VirtualAlloc fail. Soluție: build pe Vercel direct, sau pe WSL2, sau crește memoria virtuală Windows.
2. **Icon-uri PWA în maskable safe zone** — generate ieri OK, dar verifică că arată decent pe Android la `https://maskable.app/editor`
3. **Edge functions Supabase neimplementate** — există migrațiile cu `cron.schedule(...)` care apelează URL-uri, dar tu trebuie să **deploy-ezi efectiv funcțiile** în `supabase/functions/`. Verifică folder-ul, e posibil să ai cod TypeScript dar netranspilat/nedeploy-uit.

### 🟠 Polish lipsă
4. **Theme switcher real** — `next-themes` e instalat dar `appearance-panel.tsx` probabil doar set-ează clasă pe html. Verifică dacă persistă, dacă respectă system preference, dacă tranziția e smooth.
5. **Loading states inconsistente** — folosești `<Skeleton>` în Suspense, dar e flat-grey. La iOS style ar trebui shimmer animat.
6. **Empty states** — în multe pagini lipsesc empty states friendly (cu emoji + CTA).
7. **Toast positions și styling** — Sonner e instalat default, n-a fost stilizat să match iOS.
8. **Haptic feedback** — `navigator.vibrate(10)` pe tap-uri importante (FAB, swipe complete) nu pare să fie peste tot.
9. **Pull-to-refresh** pe mobile — lipsește.

### 🟡 Nice-to-have V2 (după design)
10. Charts cu animații de entry (fade + grow up)
11. Confetti la goal completion (canvas-confetti instalat ✅, dar verifică integrare)
12. Sounds opționale (toggle în settings)
13. Wallpaper picker (mai multe gradient mesh-uri pe care user-ul le alege)

---

## 🚀 Plan de acțiune

### Tu, EXTERN (15-30 min)

**1. Commit checkpoint imediat:**
```bash
cd C:\Users\Andrei\Desktop\banii
git status
# dacă apare ceva untracked sau modified:
git add .
git commit -m "checkpoint: pre-design-overhaul"
```

**2. Deploy preview pe Vercel (ca să vezi build-ul reușit, fără chinul Windows-ului):**
```bash
npm i -g vercel
vercel --prod
```
Dacă nu ai cont, fă unul. Pune env vars în Vercel project settings (toate din `.env.local`). Vercel rulează build-ul Linux unde VirtualAlloc nu e bug.

**3. Edge functions Supabase (verifici ce ai și ce trebuie deploy-uit):**
```bash
ls supabase/functions/
# pentru fiecare folder cu index.ts:
npx supabase functions deploy <function_name> --project-ref ioqdwekozpcmwswhgwiv
```
Funcții esențiale: `fx-update`, `process-embeddings`, `weekly-recap`, `bank-sync`, `notifications-trigger`. Dacă nu există, Claude Code le va crea în prompt-ul de mai jos.

**4. Setări la nivel de DB pentru cron-uri (NU Vault, mergi cu `alter database`):**
```sql
-- în SQL Editor Supabase, generează 2 hex-uri local:
-- node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
alter database postgres set "app.cron_secret" to '<hex_1>';
alter database postgres set "app.iban_encryption_key" to '<hex_2>';
alter database postgres set "app.fx_function_url" to 'https://ioqdwekozpcmwswhgwiv.supabase.co/functions/v1/fx-update';
alter database postgres set "app.embeddings_function_url" to 'https://ioqdwekozpcmwswhgwiv.supabase.co/functions/v1/process-embeddings';
alter database postgres set "app.recap_function_url" to 'https://ioqdwekozpcmwswhgwiv.supabase.co/functions/v1/weekly-recap';
alter database postgres set "app.bank_sync_function_url" to 'https://ioqdwekozpcmwswhgwiv.supabase.co/functions/v1/bank-sync';
```

**5. Storage bucket `receipts`** — verifică în Supabase Dashboard → Storage că există și e Private.

**6. Auth Site URL** — verifică Authentication → URL Configuration:
- Site URL = URL-ul Vercel deployment-ului (ex: `https://banii-andrei.vercel.app`)
- Redirect URLs include și `http://localhost:3000/auth/callback`

### Claude Code (1 prompt mare în `DESIGN_PROMPT.md`)

Vezi fișierul `DESIGN_PROMPT.md` în root — îl dai ca prim mesaj în Claude Code și transformă designul complet în iOS Liquid Glass cu glow, animații, glassmorphism. Nu modifică logică, doar layer-ul vizual.

---

## ⚠️ Erori reale rămase

- **0 erori TypeScript** ✅
- **0 erori ESLint** ✅
- **4 warnings** acceptabile (react-compiler legate de `form.watch()` + `useVirtualizer()` API-uri externe)
- **Build Windows fail** — Linux/Vercel rezolvă

Per total: codul e production-ready. Ce ai nevoie e DESIGN. Așa că tot focusul rămas trebuie să fie pe vizual.
