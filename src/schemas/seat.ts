import { z } from "zod";
import { SETTABLE_SEAT_STATUSES } from "@/types/seat";

/**
 * Mirrors the backend's Bean Validation on SeatRequest so the user gets
 * immediate feedback. The backend stays authoritative: seat-number uniqueness,
 * the status rules and allocation exclusivity are decided there and their
 * errorCodes are surfaced on the form.
 */
export const seatSchema = z.object({
  seatNumber: z
    .string()
    .trim()
    .min(1, "Seat number is required")
    .max(50, "Seat number must be 50 characters or fewer")
    .refine(
      (v) => /^[A-Za-z0-9][A-Za-z0-9 _/-]*$/.test(v),
      "Seat number may only contain letters, digits, spaces and - _ /",
    ),
  // Selects submit strings; empty means "not set" and is dropped before sending.
  zoneId: z.string().optional(),
  seatTypeId: z.string().optional(),
  status: z.enum(SETTABLE_SEAT_STATUSES),
});

export type SeatValues = z.infer<typeof seatSchema>;

export const allocationSchema = z.object({
  studentId: z.string().min(1, "Choose a student"),
  startDate: z.string().optional(),
});

export type AllocationValues = z.infer<typeof allocationSchema>;
