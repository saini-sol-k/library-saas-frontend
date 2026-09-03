import { z } from "zod";

/**
 * Mirrors the backend's Bean Validation so the user is told immediately. The
 * backend stays authoritative: name and receipt uniqueness, the balance rule and
 * tenant ownership are decided there and their errorCodes are surfaced on the
 * field they concern.
 *
 * Money is validated as a decimal *string* and never parsed into a number. A
 * JavaScript number cannot hold every two-decimal value exactly, and the whole
 * point of the DECIMAL columns behind this API is that no rounding creeps in.
 * The pattern below is the only place an amount is interpreted, and it checks
 * the shape rather than the value.
 */
const MONEY = /^\d{1,10}(\.\d{1,2})?$/;

/** A positive decimal with at most two places, as a string. */
const moneyString = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .refine((v) => MONEY.test(v), "Enter an amount like 1500 or 1500.50");

/** The same, but allowed to be blank, meaning "not supplied". */
const optionalMoneyString = z
  .string()
  .trim()
  .refine((v) => v === "" || MONEY.test(v), "Enter an amount like 1500 or 1500.50")
  .optional();

export const feePlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(250, "Description must be 250 characters or fewer")
    .optional(),
  amount: moneyString("Amount is required"),
  durationValue: z
    .string()
    .trim()
    .min(1, "Duration is required")
    .refine((v) => /^\d+$/.test(v) && Number(v) > 0, "Duration must be a whole number above zero"),
  durationUnit: z
    .string()
    .trim()
    .min(1, "Duration unit is required")
    .max(20, "Duration unit must be 20 characters or fewer"),
});

export type FeePlanValues = z.infer<typeof feePlanSchema>;

export const studentFeeSchema = z.object({
  studentId: z.string().min(1, "Choose a student"),
  feePlanId: z.string().optional(),
  invoiceNumber: z
    .string()
    .trim()
    .min(1, "Invoice number is required")
    .max(50, "Invoice number must be 50 characters or fewer"),
  amount: optionalMoneyString,
  discountAmount: optionalMoneyString,
  taxAmount: optionalMoneyString,
  dueDate: z.string().min(1, "Choose a due date"),
});

export type StudentFeeValues = z.infer<typeof studentFeeSchema>;

export const paymentSchema = z.object({
  receiptNumber: z
    .string()
    .trim()
    .min(1, "Receipt number is required")
    .max(50, "Receipt number must be 50 characters or fewer"),
  amount: moneyString("Amount is required").refine(
    (v) => Number(v) > 0,
    "A payment must be greater than zero",
  ),
  paymentMethod: z.string().trim().min(1, "Choose a payment method"),
  transactionReference: z
    .string()
    .trim()
    .max(150, "Reference must be 150 characters or fewer")
    .optional(),
});

export type PaymentValues = z.infer<typeof paymentSchema>;

/**
 * Payment methods offered in the picker. CASH and UPI are the two the seed data
 * evidences; the rest are ordinary alternatives the free-text column accepts.
 * The backend stores whatever it is given, upper-cased, and constrains nothing,
 * so this list is a convenience and not a rule.
 */
export const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE"] as const;
