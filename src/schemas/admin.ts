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
