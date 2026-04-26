// Revolut — extras CSV.
//
// Convenție documentată:
//   Type,Product,Started Date,Completed Date,Description,Amount,Fee,
//   Currency,State,Balance
//
//   - delimiter `,`
//   - dată ISO `YYYY-MM-DD HH:mm:ss`
//   - amount semnat (negativ debit, pozitiv credit)
//   - State filtrat la `COMPLETED`

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

export const revolut: BankParser = {
  id: "revolut",
  label: "Revolut",

  detect(csv) {
    const { headers } = parseCsv(csv);
    if (headers.length === 0) return false;
    return (
      hasAnyHeader(headers, ["completed date"]) &&
      hasAnyHeader(headers, ["state"]) &&
      hasAnyHeader(headers, ["amount"]) &&
      hasAnyHeader(headers, ["currency"])
    );
  },

  parse(csv) {
    const { headers, rows } = parseCsv(csv);
    if (headers.length === 0) return [];

    const ixDate = findColumn(headers, ["completed date", "started date"]);
    const ixDescription = findColumn(headers, ["description"]);
    const ixAmount = findColumn(headers, ["amount"]);
    const ixCurrency = findColumn(headers, ["currency"]);
    const ixState = findColumn(headers, ["state"]);
    const ixFee = findColumn(headers, ["fee"]);

    const out: ParsedTransaction[] = [];
    for (const row of rows) {
      const state = ixState >= 0 ? (row[ixState] ?? "").toUpperCase() : "";
      if (state && state !== "COMPLETED") continue;

      const date = parseDate((row[ixDate] ?? "").slice(0, 10));
      if (!date) continue;

      const value = parseDecimal(row[ixAmount] ?? "");
      if (value === null || value === 0) continue;

      const fee = ixFee >= 0 ? parseDecimal(row[ixFee] ?? "") ?? 0 : 0;
      const currency =
        (row[ixCurrency] ?? "RON").toUpperCase().trim() || "RON";

      const description = (row[ixDescription] ?? "").trim();
      // Fee-ul Revolut e separat. Dacă există, scădem din amount semnat.
      const totalValue = value - Math.abs(fee);

      const amount = toMinorUnits(totalValue, currency);
      out.push({
        date,
        amount,
        currency,
        payee: description || undefined,
        notes: description,
        external_id: makeExternalId("revolut", date, amount, description),
      });
    }
    return out;
  },
};
