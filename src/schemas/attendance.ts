import { z } from "zod";

/**
 * Mirrors the backend's Bean Validation on CheckInRequest so the user is told
 * immediately. The backend stays authoritative: whether the student belongs to
 * the library, whether they are already checked in, and whether a named seat is
 * in this library are decided there, and their errorCodes are surfaced on the
 * field they concern.
 *
 * Selects submit strings, so the ids are validated as non-empty strings here
 * and converted to numbers on submit.
 */
export const checkInSchema = z.object({
  studentId: z.string().min(1, "Choose a student"),
  /** Empty means "no seat"; dropped before sending. */
  seatId: z.string().optional(),
});

export type CheckInValues = z.infer<typeof checkInSchema>;
