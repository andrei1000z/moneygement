// Banca Transilvania (BT24) — extras CSV.
//
// Convenție observată în export-uri:
//   - delimiter `;`
//   - encoding UTF-8 cu BOM
//   - headers (RO): "Data tranzactiei", "Detalii tranzactie", "Suma debit",
//     "Suma credit", "Valuta", "Sold"
//   - sumele cu virgulă decimal (ro)

import type { BankParser, ParsedTransaction } from "../types";
import {
  findColumn,
  hasAnyHeader,
  makeExternalId,
  parseCsv,
  parseDate,
  parseDecimal,
  toMinorUnits,
} from "./_helpers";

export const bt24: BankParser = {
  id: "bt24",
  label: "Banca Transilvania (BT24)",

  detect(csv) {
    const { headers } = parseCsv(csv);
    if (headers.length === 0) return false;
    const hasDate = hasAnyHeader(headers, [
      "data tranzactiei",
      "data tranzacției",
      /^data$/,
    ]);
    const hasDetails = hasAnyHeader(headers, [
      "detalii tranzactie",
      "detalii tranzacție",
      "detalii",
    ]);
    const hasDebit = hasAnyHeader(headers, ["suma debit", "debit"]);
    const hasCredit = hasAnyHeader(headers, ["suma credit", "credit"]);
    return hasDate && hasDetails && hasDebit && hasCredit;
  },

  parse(csv) {
    const { headers, rows } = parseCsv(csv);
    if (headers.length === 0) return [];

    const ixDate = findColumn(headers, [
      "data tranzactiei",
      "data tranzacției",
      /^data$/,
    ]);
    const ixDetails = findColumn(headers, [
      "detalii tranzactie",
      "detalii tranzacție",
      "detalii",
    ]);
    const ixDebit = findColumn(headers, ["suma debit", "debit"]);
    const ixCredit = findColumn(headers, ["suma credit", "credit"]);
    const ixCurrency = findColumn(headers, ["valuta", "moneda"]);
    const ixPayee = findColumn(headers, [
      "beneficiar",
      "ordonator",
      "platitor",
      "plătitor",
    ]);

    const out: ParsedTransaction[] = [];
    for (const row of rows) {
      const date = parseDate(row[ixDate] ?? "");
      if (!date) continue;

      const debit = parseDecimal(row[ixDebit] ?? "");
      const credit = parseDecimal(row[ixCredit] ?? "");
      let value = 0;
      if (credit && credit > 0) value = credit;
      else if (debit && debit > 0) value = -debit;
      else continue;

      const currency = (row[ixCurrency] ?? "RON").toUpperCase().trim() || "RON";
      const notes = (row[ixDetails] ?? "").trim();
      const payee =
        ixPayee >= 0 && row[ixPayee]?.trim() ? row[ixPayee]!.trim() : undefined;

      const amount = toMinorUnits(value, currency);
      out.push({
        date,
        amount,
        currency,
        payee,
        notes,
        external_id: makeExternalId("bt24", date, amount, notes),
      });
    }
    return out;
  },
};
