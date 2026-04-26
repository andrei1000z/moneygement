import "server-only";

import { SignJWT, importPKCS8 } from "jose";

// Enable Banking client — JWT RS256 signed cu private key (PKCS#8 PEM).
// Doc: https://enablebanking.com/docs/api/reference
//
// Flow simplificat:
//   1. POST /auth → primim PSU URL + auth_code (creat în /sessions)
//   2. UI: redirect user la PSU URL (SCA la banca)
//   3. Banca redirectează la callback cu state + code
//   4. POST /sessions { code } → primim session_uid (180 zile)
//   5. GET /sessions/{uid}/accounts
//   6. GET /accounts/{uid}/balances și /accounts/{uid}/transactions
//   7. La 180 zile reînnoim consimțământul (UI: "Reînnoiește acces").

const BASE_URL = "https://api.enablebanking.com";

let cachedKey: CryptoKey | null = null;

async function getPrivateKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const pem = process.env.ENABLE_BANKING_PRIVATE_KEY;
  if (!pem) {
    throw new Error(
      "ENABLE_BANKING_PRIVATE_KEY (PKCS#8 PEM) lipsește din env.",
    );
  }
  cachedKey = await importPKCS8(pem.replace(/\\n/g, "\n"), "RS256");
  return cachedKey;
}

async function makeJwt(): Promise<string> {
  const appId = process.env.ENABLE_BANKING_APPLICATION_ID;
  const kid = process.env.ENABLE_BANKING_KEY_ID;
  if (!appId || !kid) {
    throw new Error(
      "ENABLE_BANKING_APPLICATION_ID și ENABLE_BANKING_KEY_ID necesare.",
    );
  }
  const key = await getPrivateKey();
  return new SignJWT({ iss: appId })
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid })
    .setIssuedAt()
    .setExpirationTime("60s")
    .setIssuer(appId)
    .sign(key);
}

async function authedFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const jwt = await makeJwt();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Enable Banking ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ---------- Public API ---------------------------------------------------

export type StartAuthResponse = {
  url: string;            // PSU URL pentru SCA
  authorization_id: string;
};

/**
 * Pornește un flow de autentificare la o instituție. Răspunde cu un URL
 * la care redirectăm userul pentru SCA.
 */
export async function startAuth(args: {
  institution_id: string;
  redirect_url: string;
  state: string;
}): Promise<StartAuthResponse> {
  return authedFetch("/auth", {
    method: "POST",
    body: JSON.stringify({
      access: { valid_until: new Date(Date.now() + 180 * 86400000).toISOString() },
      aspsp: { name: args.institution_id, country: "RO" },
      state: args.state,
      redirect_url: args.redirect_url,
      psu_type: "personal",
    }),
  });
}

export type Session = {
  session_id: string;
  accounts: string[];
};

/**
 * După ce userul s-a întors din SCA cu un code, exchange-uim pentru
 * session_id (180 zile valabilitate).
 */
export async function createSession(authCode: string): Promise<Session> {
  return authedFetch("/sessions", {
    method: "POST",
    body: JSON.stringify({ code: authCode }),
  });
}

export type AccountsResponse = {
  accounts: Array<{
    uid: string;
    iban?: string;
    name?: string;
    currency: string;
    product?: string;
  }>;
};

export async function getAccounts(sessionId: string): Promise<AccountsResponse> {
  return authedFetch(`/sessions/${encodeURIComponent(sessionId)}/accounts`);
}

export type BalancesResponse = {
  balances: Array<{
    name: string;
    balance_amount: { amount: string; currency: string };
    balance_type: string;
  }>;
};

export async function getBalances(
  accountUid: string,
): Promise<BalancesResponse> {
  return authedFetch(
    `/accounts/${encodeURIComponent(accountUid)}/balances`,
  );
}

export type TransactionsResponse = {
  transactions: Array<{
    entry_reference?: string;
    transaction_id?: string;
    booking_date: string; // YYYY-MM-DD
    transaction_amount: { amount: string; currency: string };
    creditor_name?: string;
    debtor_name?: string;
    remittance_information?: string[];
    transaction_code?: string;
  }>;
  continuation_key?: string | null;
};

export async function getTransactions(
  accountUid: string,
  fromDate: string,
  toDate: string,
  continuationKey?: string,
): Promise<TransactionsResponse> {
  const params = new URLSearchParams();
  params.set("date_from", fromDate);
  params.set("date_to", toDate);
  if (continuationKey) params.set("continuation_key", continuationKey);
  return authedFetch(
    `/accounts/${encodeURIComponent(accountUid)}/transactions?${params.toString()}`,
  );
}
