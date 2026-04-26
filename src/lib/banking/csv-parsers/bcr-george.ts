// BCR George — extras CSV.
//
// Convenție observată:
//   - delimiter `,` (uneori `;`)
//   - headers (EN): "BookingDate", "ValueDate", "PartnerName", "PartnerAccount",
//     "Description", "Amount", "Currency"
//   - amount semnat (negativ = debit, pozitiv = credit)
//   - dată ISO sau dd.mm.yyyy

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

export const bcrGeorge: BankParser = {
  id: "bcr",
  label: "BCR George",

  detect(csv) {
    const { headers } = parseCsv(csv);
    if (headers.length === 0) return false;
    return (
      hasAnyHeader(headers, ["bookingdate", "booking date", "data inregistrare"]) &&
      hasAnyHeader(headers, ["amount", "suma"]) &&
      (hasAnyHeader(headers, ["partnername", "partner name", "partener"]) ||
        hasAnyHeader(headers, ["description", "descriere"]))
    );
  },

  parse(csv) {
    const { headers, rows } = parseCsv(csv);
    if (headers.length === 0) return [];

    const ixDate = findColumn(headers, [
      "bookingdate",
      "booking date",
      "data inregistrare",
      "data tranzactie",
      "data",
    ]);
    const ixAmount = findColumn(headers, ["amount", "suma"]);
    const ixCurrency = findColumn(headers, ["currency", "valuta", "moneda"]);
    const ixPartner = findColumn(headers, [
      "partnername",
      "partner name",
      "partener",
      "beneficiar",
    ]);
    const ixDescription = findColumn(headers, [
      "description",
      "descriere",
      "details",
      "detalii",
    ]);

    const out: ParsedTransaction[] = [];
    for (const row of rows) {
      const date = parseDate(row[ixDate] ?? "");
      if (!date) continue;
      const value = parseDecimal(row[ixAmount] ?? "");
      if (value === null || value === 0) continue;

      const currency =
        (row[ixCurrency] ?? "RON").toUpperCase().trim() || "RON";
      const partner =
        ixPartner >= 0 && row[ixPartner]?.trim() ? row[ixPartner]!.trim() : "";
      const description =
        ixDescription >= 0 && row[ixDescription]?.trim()
          ? row[ixDescription]!.trim()
          : "";
      const notes = description || partner;

      const amount = toMinorUnits(value, currency);
      out.push({
        date,
        amount,
        currency,
        payee: partner || undefined,
        notes,
        external_id: makeExternalId("bcr", date, amount, notes),
      });
    }
    return out;
  },
};
