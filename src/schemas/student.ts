import { z } from "zod";

/**
 * Client-side validation mirroring the backend's Bean Validation rules so the
 * user gets immediate feedback. The backend stays authoritative: uniqueness of
 * the student code and any other business rule is decided there, and its
 * errorCode is surfaced on the form.
 */

const optionalTrimmed = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .optional()
    .or(z.literal(""));

const MOBILE = /^[0-9+][0-9 ()-]{5,19}$/;

export const studentCreateSchema = z.object({
  studentCode: z
    .string()
    .trim()
    .min(1, "Student code is required")
    .max(50, "Student code must be 50 characters or fewer"),
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(100, "First name must be 100 characters or fewer"),
  lastName: optionalTrimmed(100, "Last name"),
  mobile: z
    .string()
    .trim()
    .max(30, "Mobile must be 30 characters or fewer")
    .refine((v) => v === "" || MOBILE.test(v), "Enter a valid contact number")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .max(150, "Email must be 150 characters or fewer")
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email address")
    .optional()
    .or(z.literal("")),
  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || new Date(v) < new Date(),
      "Date of birth must be in the past",
    ),
  gender: optionalTrimmed(30, "Gender"),
  joiningDate: z.string().min(1, "Joining date is required"),
  status: z.string().max(30).optional().or(z.literal("")),
});

/** Update omits studentCode: the backend's update DTO does not accept it. */
export const studentUpdateSchema = studentCreateSchema.omit({ studentCode: true });

export type StudentCreateValues = z.infer<typeof studentCreateSchema>;
export type StudentUpdateValues = z.infer<typeof studentUpdateSchema>;

/** Strips empty strings so optional fields are omitted rather than sent blank. */
export function pruneEmpty<T extends Record<string, unknown>>(values: T): T {
  const out = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(values)) {
    if (value !== "" && value !== undefined && value !== null) out[key] = value;
  }
  return out as T;
}

export const STUDENT_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
