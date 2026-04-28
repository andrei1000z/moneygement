# @banii/mcp-server

MCP (Model Context Protocol) server pentru **Banii** — aplicație de finanțe personale Romania-first. Conectează **Claude Desktop** la datele tale Banii ca să poți cere AI-ului să-ți analizeze cheltuieli, prezică cashflow, sau să adauge tranzacții direct prin chat.

## Setup

### 1. Generează un Personal Access Token

În aplicația Banii (https://moneygement.vercel.app):

1. Login → Setări → tab **Profil**
2. Scroll la **API Access** → click **Generează**
3. Numește-l "Claude Desktop", alege scope-uri:
   - **Read-only** (recomandat) — Claude poate doar citi tranzacții, bugete, goals
   - **Read + Write** — Claude poate adăuga tranzacții (atenție!)
4. Click **Generează token** → copiază imediat (nu va mai fi afișat)

### 2. Configurează Claude Desktop

Editează `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Adaugă:

```json
{
  "mcpServers": {
    "banii": {
      "command": "npx",
      "args": ["-y", "@banii/mcp-server"],
      "env": {
        "BANII_PAT_TOKEN": "bnii_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "BANII_API_URL": "https://moneygement.vercel.app"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

După restart, scrie în chat: "Ce conturi am în Banii?". Claude va folosi tool-ul `get_net_worth` și-ți va răspunde cu datele tale.

## Tool-uri expuse

- **get_me** — info user + household + scopes token
- **query_transactions** — filtrare tranzacții după dată / categorie
- **get_net_worth** — solduri toate conturile active
- **get_budgets** — progres bugete pe luna curentă (sau dată)
- **get_goals** — obiective + procent atins
- **add_transaction** *(write only)* — adaugă tx manuală

## Exemple prompts

> "Câți bani am cheltuit pe Mâncare luna asta?"
> Claude apelează `get_budgets` → răspunde cu suma + procent buget consumat

> "Adaugă o tranzacție de 50 lei la Lidl ieri"
> Claude apelează `add_transaction` cu account_id default, payee="Lidl", amount=-5000, occurred_on=ieri

> "Care e net worth-ul meu?"
> Claude apelează `get_net_worth` → însumare conturi în RON

## Securitate

- Token-ul e **per-user** (nu per-household, dar limitat la household-ul activ la creare)
- Token-ul NU se poate descoperi după creare (doar prefix `bnii_xxxxxxx…` rămâne vizibil)
- Token-ul poate fi revocat oricând din Banii → Setări → API Access
- Scope `write` permite doar `add_transaction`, nu `delete` sau modificări la `goals`/`budgets`
- API rate-limit nu e setat încă — pentru abuzuri evidente, revocă token-ul

## Dezvoltare locală

```bash
npm install
npm run dev    # rulează cu tsx watch
npm run build  # compilează în dist/
```

## License

MIT
