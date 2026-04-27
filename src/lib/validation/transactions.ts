import { z } from "zod";

import { SUPPORTED_CURRENCIES } from "@/lib/money";

const TX_STATUS = ["cleared", "pending", "scheduled", "void"] as const;
const TX_SOURCE = [
  "manual",
  "import",
  "bank_sync",
  "recurring",
  "transfer",
] as const;
const OWNERSHIP = ["mine", "yours", "shared"] as const;

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data trebuie să fie YYYY-MM-DD");

export const transactionInputSchema = z.object({
  account_id: z.string().uuid(),
  occurred_on: dateString,
  /** Suma în unități MINORE (semnată). Negativ = expense, pozitiv = income. */
  amount: z.number().int(),
  currency: z.enum(SUPPORTED_CURRENCIES as readonly [string, ...string[]]),
  payee: z.string().trim().max(120).optional().nullable(),
  merchant_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  status: z.enum(TX_STATUS).optional(),
  ownership: z.enum(OWNERSHIP).optional(),
  // Multi-currency: dacă merchant-ul a încasat în altă monedă decât contul.
  original_amount: z.number().int().nullable().optional(),
  original_currency: z
    .enum(SUPPORTED_CURRENCIES as readonly [string, ...string[]])
    .nullable()
    .optional(),
  source: z.enum(TX_SOURCE).optional(),
  is_transfer: z.boolean().optional(),
  transfer_pair_id: z.string().uuid().nullable().optional(),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;

// ---------- Split items -------------------------------------------------

export const splitItemSchema = z.object({
  amount: z.number().int(),
  category_id: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(200).optional().nullable(),
  payee: z.string().trim().max(120).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
});

export type SplitItem = z.infer<typeof splitItemSchema>;

// ---------- Bulk patch --------------------------------------------------

export const bulkPatchSchema = z
  .object({
    category_id: z.string().uuid().nullable().optional(),
    add_tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
    status: z.enum(TX_STATUS).optional(),
    ownership: z.enum(OWNERSHIP).optional(),
    delete: z.literal(true).optional(),
  })
  .refine(
    (p) =>
      p.category_id !== undefined ||
      (p.add_tags && p.add_tags.length > 0) ||
      p.status !== undefined ||
      p.ownership !== undefined ||
      p.delete === true,
    { message: "Nu ai specificat ce să modifici" },
  );

export type BulkPatch = z.infer<typeof bulkPatchSchema>;

// ---------- Action result --------------------------------------------------

/**
 * Discriminated union pentru rezultatul unei server action. Trăiește aici
 * (NU în actions.ts cu 'use server') pentru că Next 16 acceptă doar export-uri
 * de async functions în fișiere 'use server'.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };


