// Tipuri partajate pentru parserii CSV ai băncilor românești.

export type ParsedTransaction = {
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  /** Suma în unități minore (bani pentru RON, cents pentru EUR). Negativ = debit. */
  amount: bigint;
  /** ISO 4217. Default: 'RON'. */
  currency: string;
  /** Plătitor / beneficiar. Necanonicalizat — vom rula merchant matcher separat. */
  payee?: string;
  /** Descriere brută din extras. */
  notes?: string;
  /** ID extern pentru deduplicare. Stabilim noi din (date+amount+description hash). */
  external_id: string;
};

export type BankFormat =
  | "bt24"
  | "bcr"
  | "ing"
  | "revolut"
  | "cec"
  | "raiffeisen";

export type BankParser = {
  id: BankFormat;
  label: string;
  /** Verifică headers + primele rânduri — nu consumă tot fișierul. */
  detect: (csv: string) => boolean;
  parse: (csv: string) => ParsedTransaction[];
};
