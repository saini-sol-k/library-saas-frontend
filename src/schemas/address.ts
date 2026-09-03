import { z } from "zod";

/**
 * Mirrors the backend's Bean Validation on AddressRequest so the user gets
 * immediate feedback. The backend stays authoritative: allowed address types,
 * the one-per-type rule and the single-primary rule are decided there and their
 * errorCodes are surfaced on the form.
 */

const optional = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .optional()
    .or(z.literal(""));

const PHONE = /^[0-9+][0-9 ()-]{5,19}$/;
const POSTAL = /^[A-Za-z0-9][A-Za-z0-9 -]{2,19}$/;

const phone = (label: string) =>
  z
    .string()
    .trim()
    .max(30, `${label} must be 30 characters or fewer`)
    .refine((v) => v === "" || PHONE.test(v), `${label} must be a valid contact number`)
    .optional()
    .or(z.literal(""));

export const addressSchema = z.object({
  firstName: optional(100, "First name"),
  lastName: optional(100, "Last name"),
  addressLine1: z
    .string()
    .trim()
    .min(1, "Address line 1 is required")
    .max(250, "Address line 1 must be 250 characters or fewer"),
  addressLine2: optional(250, "Address line 2"),
  addressLine3: optional(250, "Address line 3"),
  landmark: optional(200, "Landmark"),
  city: z.string().trim().min(1, "City is required").max(100, "City must be 100 characters or fewer"),
  district: optional(100, "District"),
  state: z.string().trim().min(1, "State is required").max(100, "State must be 100 characters or fewer"),
  country: optional(100, "Country"),
  postalCode: z
    .string()
    .trim()
    .min(1, "Postal code is required")
    .max(20, "Postal code must be 20 characters or fewer")
    .refine(
      (v) => POSTAL.test(v),
      "Postal code may only contain letters, digits, spaces and hyphens",
    ),
  phone1: phone("Phone"),
  phone2: phone("Alternate phone"),
  email: z
    .string()
    .trim()
    .max(150, "Email must be 150 characters or fewer")
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email address")
    .optional()
    .or(z.literal("")),
  addressType: z.string().min(1, "Address type is required"),
  isPrimary: z.boolean(),
});

export type AddressValues = z.infer<typeof addressSchema>;
