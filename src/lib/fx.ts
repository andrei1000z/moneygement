// Foreign exchange utilities — BNR primary, Frankfurter fallback.
// The pipeline (daily fetch + DB upsert + cross-rate lookups) is built in
// Phase 1 alongside the `exchange_rates` table.

export const BNR_DAILY_URL = "https://www.bnr.ro/nbrfxrates.xml" as const;
export const BNR_TEN_DAYS_URL =
  "https://www.bnr.ro/nbrfxrates10days.xml" as const;
export const FRANKFURTER_BASE_URL = "https://api.frankfurter.app" as const;
