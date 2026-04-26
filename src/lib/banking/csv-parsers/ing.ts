// ING Home'Bank — extras CSV.
//
// Convenție observată:
//   - delimiter `;` sau `,`
//   - headers (RO): "Data", "Detalii", "Debit", "Credit", "Beneficiar/Ordonator"
//   - sumele cu virgulă decimal

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

export const ing: BankParser = {
  id: "ing",
  label: "ING Home'Bank",

  detect(csv) {
    const { headers } = parseCsv(csv);
    if (headers.length === 0) return false;
    // ING e identificabilă prin combinația „Beneficiar/Ordonator" împreună
    // cu Debit + Credit separate. BT-ul are headere mai descriptive.
    const hasPartner = hasAnyHeader(headers, [
      "beneficiar/ordonator",
      "beneficiar",
      "ordonator",
    ]);
    const hasDebitCredit =
      hasAnyHeader(headers, [/^debit$/]) && hasAnyHeader(headers, [/^credit$/]);
    const hasDate = hasAnyHeader(headers, [/^data$/, "data tranzacț"]);
    return hasPartner && hasDebitCredit && hasDate;
  },

  parse(csv) {
    const { headers, rows } = parseCsv(csv);
    if (headers.length === 0) return [];

    const ixDate = findColumn(headers, [/^data$/, "data tranzacț"]);
    const ixDetails = findColumn(headers, [
      "detalii",
      "descriere",
      "explicatii",
    ]);
    const ixDebit = findColumn(headers, [/^debit$/]);
    const ixCredit = findColumn(headers, [/^credit$/]);
    const ixCurrency = findColumn(headers, ["valuta", "moneda", "currency"]);
    const ixPartner = findColumn(headers, [
      "beneficiar/ordonator",
      "beneficiar",
      "ordonator",
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

      const currency =
        (row[ixCurrency] ?? "RON").toUpperCase().trim() || "RON";
      const details = ixDetails >= 0 ? (row[ixDetails] ?? "").trim() : "";
      const partner = ixPartner >= 0 ? (row[ixPartner] ?? "").trim() : "";
      const notes = details || partner;

      const amount = toMinorUnits(value, currency);
      out.push({
        date,
        amount,
        currency,
        payee: partner || undefined,
        notes,
        external_id: makeExternalId("ing", date, amount, notes),
      });
    }
    return out;
  },
};
