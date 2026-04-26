// CEC Mobile — extras CSV.
//
// Convenție observată:
//   - delimiter `;`
//   - headers (RO): "Data operatiunii", "Descriere", "Suma", "Valuta", "Tip operatiune"
//   - sumele cu virgulă decimal; semnul determinat de "Tip operatiune"

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

export const cec: BankParser = {
  id: "cec",
  label: "CEC Mobile",

  detect(csv) {
    const { headers } = parseCsv(csv);
    if (headers.length === 0) return false;
    return (
      hasAnyHeader(headers, ["data operatiunii", "data operațiunii"]) &&
      hasAnyHeader(headers, ["tip operatiune", "tip operațiune"]) &&
      hasAnyHeader(headers, ["suma"])
    );
  },

  parse(csv) {
    const { headers, rows } = parseCsv(csv);
    if (headers.length === 0) return [];

    const ixDate = findColumn(headers, [
      "data operatiunii",
      "data operațiunii",
      "data tranzactiei",
    ]);
    const ixDescription = findColumn(headers, ["descriere", "detalii"]);
    const ixAmount = findColumn(headers, ["suma"]);
    const ixCurrency = findColumn(headers, ["valuta", "moneda"]);
    const ixType = findColumn(headers, ["tip operatiune", "tip operațiune"]);

    const out: ParsedTransaction[] = [];
    for (const row of rows) {
      const date = parseDate(row[ixDate] ?? "");
      if (!date) continue;

      let value = parseDecimal(row[ixAmount] ?? "");
      if (value === null || value === 0) continue;

      // Tip = "Debit"/"Iesire"/"Plata" → negativ; altfel pozitiv.
      const type = (row[ixType] ?? "").toLowerCase();
      const isDebit = /(debit|iesire|ieșire|plata|plată)/.test(type);
      if (isDebit && value > 0) value = -value;

      const currency =
        (row[ixCurrency] ?? "RON").toUpperCase().trim() || "RON";
      const notes = (row[ixDescription] ?? "").trim();

      const amount = toMinorUnits(value, currency);
      out.push({
        date,
        amount,
        currency,
        payee: undefined,
        notes,
        external_id: makeExternalId("cec", date, amount, notes),
      });
    }
    return out;
  },
};
