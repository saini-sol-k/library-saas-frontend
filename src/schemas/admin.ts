import { z } from "zod";

/**
 * Customer onboarding form rules.
 *
 * Every constraint mirrors one the backend already enforces, so this only saves
 * a round trip - the backend remains authoritative and its VALIDATION_ERROR
 * response is pinned back onto the matching field.
 *
 * There is no password field by design: the backend generates the initial
 * password, so it is never typed, never held in form state and never sent.
 */

/**
 * Largest seat count the backend accepts (SeatProvisioningService.MAX_SEAT_COUNT).
 *
 * A documented business maximum rather than a schema limit: a seat-count change
 * writes one row per seat in a single transaction, so a typo of 1000000 would
 * otherwise try to write a million rows. 10,000 is far above any real study
 * centre, so it constrains nobody in practice.
 */
export const MAX_SEAT_COUNT = 10000;

/**
 * The wording the backend returns for the same rejections, repeated here so a
 * value caught before the request reads identically to one caught after it.
 */
export const SEAT_COUNT_MESSAGES = {
  required: "Number of seats is required.",
  whole: "Number of seats must be a whole number.",
  positive: "Number of seats must be greater than 0.",
  max: `Number of seats cannot exceed ${MAX_SEAT_COUNT}.`,
} as const;

export const customerOnboardingSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(1, "Organization name is required")
    .max(200, "Organization name must not exceed 200 characters"),
  organizationCode: z
    .string()
    .trim()
    .max(50, "Organization code must not exceed 50 characters")
    .regex(/^[A-Za-z0-9_-]*$/, "Use only letters, digits, hyphen or underscore")
    .optional(),
  libraryName: z
    .string()
    .trim()
    .min(1, "Library name is required")
    .max(200, "Library name must not exceed 200 characters"),
  libraryCode: z
    .string()
    .trim()
    .max(50, "Library code must not exceed 50 characters")
    .regex(/^[A-Za-z0-9_-]*$/, "Use only letters, digits, hyphen or underscore")
    .optional(),
  // Held as a string, like every other control on this form, and converted to a
  // number on submit. Tested as digits rather than parsed: Number("1.5") is a
  // valid number that would then have to be rejected, whereas a digits-only
  // test turns down "1.5", "-5" and "1e3" in one rule.
  //
  // Each rejection is spelled out because the form submits with noValidate, so
  // the browser's own number-input messages never appear.
  seatCount: z
    .string()
    .trim()
    .min(1, SEAT_COUNT_MESSAGES.required)
    .regex(/^\d+$/, SEAT_COUNT_MESSAGES.whole)
    .refine((value) => Number(value) > 0, SEAT_COUNT_MESSAGES.positive)
    .refine((value) => Number(value) <= MAX_SEAT_COUNT, SEAT_COUNT_MESSAGES.max),
  timezone: z.string().trim().max(50).optional(),
  adminUsername: z
    .string()
    .trim()
    .min(1, "Login username is required")
    .max(100, "Username must not exceed 100 characters")
    .regex(/^[A-Za-z0-9._-]+$/, "Use only letters, digits, dot, hyphen or underscore"),
  adminEmail: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(150, "Email must not exceed 150 characters"),
  adminFirstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(100, "First name must not exceed 100 characters"),
  adminLastName: z.string().trim().max(100).optional(),
  adminMobile: z
    .string()
    .trim()
    .regex(/^$|^[0-9+][0-9 ()-]{5,19}$/, "Enter a valid contact number")
    .optional(),
});

export type CustomerOnboardingValues = z.infer<typeof customerOnboardingSchema>;

/**
 * Timezones offered in the form. The backend accepts any IANA zone id and
 * validates it, so this is a shortlist for convenience rather than a limit.
 */
export const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "UTC",
] as const;
