import type { ZodError } from "zod";

/**
 * Zod 4 tipează `ZodIssue.message` ca `string | undefined` (vezi
 * `RawIssue` din `zod/v4/core/errors.d.ts`). Helper-ul ăsta forțează
 * un string non-null pe care îl putem trimite înapoi UI-ului.
 */
export function firstZodMessage(
  error: ZodError,
  fallback: string = "Date invalide",
): string {
  for (const issue of error.issues) {
    if (typeof issue.message === "string" && issue.message.length > 0) {
      return issue.message;
    }
  }
  return fallback;
}
