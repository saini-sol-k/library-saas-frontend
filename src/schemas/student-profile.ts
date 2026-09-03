import { z } from "zod";

/**
 * Mirrors the backend's Bean Validation so the user is told immediately. The
 * backend stays authoritative: tenant ownership and the one-primary-per-student
 * rule are decided there.
 *
 * There is no addressId field anywhere here, matching the API. An emergency
 * contact's address is always supplied inline, because the address table is
 * global and referencing one by id could reach another tenant's row.
 */
export const studentDocumentSchema = z.object({
  documentType: z
    .string()
    .trim()
    .min(1, "Document type is required")
    .max(50, "Document type must be 50 characters or fewer"),
  documentNumber: z
    .string()
    .trim()
    .max(100, "Document number must be 100 characters or fewer")
    .optional(),
  documentUrl: z
    .string()
    .trim()
    .max(500, "Reference must be 500 characters or fewer")
    .optional(),
});

export type StudentDocumentValues = z.infer<typeof studentDocumentSchema>;

/** Field rules copied from the Phase 2A address schema so the two behave alike. */
const POSTAL = /^[A-Za-z0-9][A-Za-z0-9 -]{2,19}$/;
const PHONE = /^[0-9+][0-9 ()-]{5,19}$/;

export const emergencyContactSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(100, "First name must be 100 characters or fewer"),
    lastName: z.string().trim().max(100, "Last name must be 100 characters or fewer").optional(),
    relationship: z
      .string()
      .trim()
      .max(50, "Relationship must be 50 characters or fewer")
      .optional(),
    mobile: z
      .string()
      .trim()
      .refine((v) => v === "" || PHONE.test(v), "Mobile must be a valid contact number")
      .optional(),
    email: z
      .string()
      .trim()
      .refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email")
      .optional(),
    isPrimary: z.boolean().optional(),
    /** Blank means "no address"; partly filled is rejected below. */
    addressLine1: z.string().trim().max(250, "Address line 1 is too long").optional(),
    city: z.string().trim().max(100, "City is too long").optional(),
    state: z.string().trim().max(100, "State is too long").optional(),
    postalCode: z
      .string()
      .trim()
      .refine((v) => v === "" || POSTAL.test(v), "Enter a valid postal code")
      .optional(),
  })
  .superRefine((values, ctx) => {
    // The address is all-or-nothing: the backend requires line 1, city, state
    // and postal code together, so a half-filled address is caught here rather
    // than coming back as four separate field errors.
    const parts = [values.addressLine1, values.city, values.state, values.postalCode];
    const filled = parts.filter((p) => p && p.length > 0).length;
    if (filled === 0 || filled === parts.length) return;

    const required: Array<keyof typeof values> = [
      "addressLine1",
      "city",
      "state",
      "postalCode",
    ];
    for (const field of required) {
      if (!values[field]) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: "Required when an address is given",
        });
      }
    }
  });

export type EmergencyContactValues = z.infer<typeof emergencyContactSchema>;
