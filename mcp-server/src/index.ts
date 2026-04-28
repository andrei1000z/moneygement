#!/usr/bin/env node
/**
 * Banii MCP Server — Claude Desktop ↔ Banii bridge.
 *
 * Stdio transport, deci Claude Desktop îl pornește ca subprocess.
 * Authentication: PAT din env BANII_PAT_TOKEN.
 * API URL: BANII_API_URL (default https://moneygement.vercel.app).
 *
 * Tools expuse:
 *   - get_me                 — info user + household + scopes
 *   - query_transactions     — filtrare după dată / categorie / etc.
 *   - get_net_worth          — soldul total + per cont
 *   - get_budgets            — progres bugete pe luna curentă sau dată
 *   - get_goals              — listă obiective + progres
 *   - add_transaction        — (necesită scope=write) creare tx manuală
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_URL = process.env.BANII_API_URL ?? "https://moneygement.vercel.app";
const TOKEN = process.env.BANII_PAT_TOKEN;

if (!TOKEN) {
  console.error("Missing BANII_PAT_TOKEN env var. Get one from /settings → API Access.");
  process.exit(1);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Banii API ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

const server = new Server(
  {
    name: "banii",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_me",
      description:
        "Întoarce informații despre user-ul autentificat și gospodăria activă (numele, moneda de bază, scopes).",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "query_transactions",
      description:
        "Listează tranzacții cu filtre opționale: from (data), to (data), category_id (uuid), is_transfer (true/false), limit (max 500).",
      inputSchema: {
        type: "object",
        properties: {
          from: { type: "string", description: "Data start (YYYY-MM-DD)" },
          to: { type: "string", description: "Data end (YYYY-MM-DD)" },
          category_id: { type: "string", description: "UUID categorie" },
          is_transfer: { type: "boolean" },
          limit: { type: "number", description: "max 500 (default 50)" },
        },
      },
    },
    {
      name: "get_net_worth",
      description:
        "Întoarce toate conturile active + total per monedă. Util pentru calcul net worth.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_budgets",
      description:
        "Întoarce progresul bugetelor pe o lună (default = luna curentă). Format month: YYYY-MM-01.",
      inputSchema: {
        type: "object",
        properties: {
          month: {
            type: "string",
            description: "Prima zi a lunii (YYYY-MM-01). Default = luna curentă.",
          },
        },
      },
    },
    {
      name: "get_goals",
      description:
        "Listă obiective (active + arhivate) cu progres procentual și sume rămase.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "add_transaction",
      description:
        "Adaugă o tranzacție manuală. Necesită scope='write' pe token. Sumă în unități minore (50 RON = 5000). Negativă pentru cheltuieli, pozitivă pentru venit.",
      inputSchema: {
        type: "object",
        properties: {
          account_id: { type: "string", description: "UUID cont" },
          occurred_on: { type: "string", description: "YYYY-MM-DD" },
          amount: {
            type: "number",
            description: "Suma în unități minore (negativ pentru expense)",
          },
          currency: { type: "string", description: "ISO-4217 (RON, EUR, USD)" },
          payee: { type: "string" },
          category_id: { type: "string" },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["account_id", "occurred_on", "amount", "currency"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    let result: unknown;
    switch (name) {
      case "get_me":
        result = await api("/me");
        break;
      case "query_transactions": {
        const params = new URLSearchParams();
        const a = args as Record<string, unknown>;
        if (a.from) params.set("from", String(a.from));
        if (a.to) params.set("to", String(a.to));
        if (a.category_id) params.set("category_id", String(a.category_id));
        if (a.is_transfer !== undefined)
          params.set("is_transfer", String(a.is_transfer));
        if (a.limit) params.set("limit", String(a.limit));
        result = await api(`/transactions?${params.toString()}`);
        break;
      }
      case "get_net_worth":
        result = await api("/net-worth");
        break;
      case "get_budgets": {
        const a = args as Record<string, unknown>;
        const params = new URLSearchParams();
        if (a.month) params.set("month", String(a.month));
        result = await api(`/budgets?${params.toString()}`);
        break;
      }
      case "get_goals":
        result = await api("/goals");
        break;
      case "add_transaction":
        result = await api("/add-transaction", {
          method: "POST",
          body: JSON.stringify(args),
        });
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      content: [{ type: "text", text: `Error: ${msg}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[banii-mcp] Connected via stdio. Awaiting requests…");
