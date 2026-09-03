import type { ApiResponse } from "@/types/api";

/**
 * An error carrying the backend's own errorCode so screens can react to the
 * specific business rule that failed rather than showing a generic message.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string | null;
  /** Field-level messages from VALIDATION_ERROR responses. */
  readonly fieldErrors: Record<string, string> | null;

  constructor(
    message: string,
    status: number,
    errorCode: string | null,
    fieldErrors: Record<string, string> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Human wording for the business error codes the backend actually returns.
 * Anything not listed falls back to the backend's own message, which is
 * already written for end users - never to "Internal server error".
 */
const MESSAGES: Record<string, string> = {
  // Students
  STUDENT_NOT_FOUND: "That student no longer exists. It may have been removed.",
  STUDENT_CODE_ALREADY_EXISTS:
    "That student code is already used in this library. Pick a different code.",

  // Addresses
  ADDRESS_NOT_FOUND: "That address is no longer on this record.",
  ADDRESS_TYPE_ALREADY_EXISTS:
    "An address of this type already exists. Edit the existing one, or choose another type.",
  INVALID_ADDRESS_TYPE: "That is not a valid address type for this record.",

  // Seats
  SEAT_NOT_FOUND: "That seat no longer exists in this library.",
  SEAT_NUMBER_ALREADY_EXISTS:
    "That seat number is already used in this library. Pick a different number.",
  INVALID_SEAT_STATUS:
    "That is not a valid seat status. A seat becomes Occupied by allocating it.",
  SEAT_NOT_AVAILABLE: "That seat is not available, so it cannot be allocated.",
  SEAT_ALREADY_ALLOCATED: "That seat is already allocated to another student.",
  STUDENT_ALREADY_HAS_SEAT:
    "This student already holds a seat. Release it before allocating another.",
  SEAT_NOT_ALLOCATED: "That seat is not currently allocated, so there is nothing to release.",
  SEAT_HAS_ACTIVE_ALLOCATION: "Release this seat before changing or retiring it.",
  SEAT_ALREADY_INACTIVE: "That seat is already out of service.",
  SEAT_ZONE_NOT_FOUND: "That zone does not belong to this library.",
  SEAT_TYPE_NOT_FOUND: "That seat type does not belong to this library.",

  // Organizations and libraries
  ORGANIZATION_NOT_FOUND: "That organization no longer exists.",
  ORGANIZATION_CODE_ALREADY_EXISTS: "That organization code is already taken.",
  ORGANIZATION_INACTIVE: "This organization is inactive, so it cannot be changed.",
  ORGANIZATION_HAS_ACTIVE_LIBRARIES:
    "Deactivate the organization's libraries before deactivating the organization.",
  ORGANIZATION_ALREADY_INACTIVE: "This organization is already inactive.",
  LIBRARY_NOT_FOUND: "That library no longer exists.",
  LIBRARY_CODE_ALREADY_EXISTS: "That library code is already used in this organization.",
  LIBRARY_ALREADY_INACTIVE: "This library is already inactive.",
  INVALID_ORGANIZATION_STATUS: "That is not a valid organization status.",
  INVALID_LIBRARY_STATUS: "That is not a valid library status.",
  INVALID_OPERATING_HOURS: "Opening time must be before closing time.",
  INVALID_TIME_FORMAT: "Enter the time as HH:mm, for example 09:30.",

  // Membership
  USER_NOT_FOUND: "That user account was not found.",
  USER_ALREADY_IN_ORGANIZATION: "This user is already a member of the organization.",
  MEMBERSHIP_STATUS_UNCHANGED: "That membership already has this status.",
  // Shared by staff memberships (Active/Inactive) and student memberships
  // (Active/Expired/Cancelled), so the wording stays true of both.
  INVALID_MEMBERSHIP_STATUS: "That status is not allowed for this membership.",
  ORGANIZATION_MEMBERSHIP_INACTIVE: "That organization membership is not active.",
  LIBRARY_MEMBERSHIP_INACTIVE: "That library membership is not active.",
  LIBRARY_INACTIVE: "This library is inactive, so its memberships cannot be changed.",
  LIBRARY_ORGANIZATION_MISSING: "That library is not linked to an organization.",
  USER_ALREADY_IN_LIBRARY: "This user is already a member of the library.",
  // Student memberships
  STUDENT_MEMBERSHIP_NOT_FOUND: "That membership was not found.",
  STUDENT_NOT_IN_LIBRARY: "That student does not belong to this library.",
  INVALID_MEMBERSHIP_PERIOD: "The end date must be after the start date.",
  MEMBERSHIP_NUMBER_ALREADY_EXISTS:
    "That membership number is already used in this library.",
  STUDENT_MEMBERSHIP_OVERLAP:
    "This student already has an active membership covering those dates.",
  // Attendance
  ATTENDANCE_NOT_FOUND: "That attendance record was not found.",
  STUDENT_ALREADY_CHECKED_IN: "This student is already checked in.",
  ATTENDANCE_ALREADY_CLOSED: "That visit has already been checked out.",
  INVALID_ATTENDANCE_STATUS: "A visit can only be Present or Completed.",
  INVALID_ATTENDANCE_PERIOD: "The check-out time cannot be before the check-in time.",
  // Fees and payments
  FEE_PLAN_NOT_FOUND: "That fee plan was not found in this library.",
  FEE_PLAN_NAME_ALREADY_EXISTS: "A fee plan with that name already exists in this library.",
  FEE_PLAN_INACTIVE: "That fee plan has been retired, so it cannot be billed against.",
  INVALID_FEE_PLAN_STATUS: "A fee plan can only be Active or Inactive.",
  INVALID_FEE_AMOUNT: "Check the amounts: they cannot be negative and the discount cannot exceed the total.",
  STUDENT_FEE_NOT_FOUND: "That invoice was not found.",
  INVOICE_NUMBER_ALREADY_EXISTS: "That invoice number is already used in this library.",
  INVALID_STUDENT_FEE_STATUS: "An invoice can only be Pending, Partly paid or Paid.",
  MEMBERSHIP_NOT_FOR_STUDENT: "That membership does not belong to this student.",
  PAYMENT_NOT_FOUND: "That payment was not found.",
  RECEIPT_NUMBER_ALREADY_EXISTS: "That receipt number has already been used in this library.",
  PAYMENT_EXCEEDS_BALANCE: "That is more than the outstanding balance on this invoice.",
  INVALID_PAYMENT_AMOUNT: "A payment must be greater than zero.",
  STUDENT_FEE_ALREADY_PAID: "This invoice is already settled in full.",
  USER_NOT_IN_ORGANIZATION: "This user is not a member of the organization.",
  USER_NOT_IN_LIBRARY: "This user is not a member of the library.",
  ORGANIZATION_LAST_MEMBER: "An organization must keep at least one active member.",

  // Auth and access
  UNAUTHORIZED: "Your session has ended. Please sign in again.",
  INVALID_CREDENTIALS: "That username or password is not correct.",
  INVALID_REFRESH_TOKEN: "Your session has expired. Please sign in again.",
  FORBIDDEN: "You do not have permission to do that.",

  // Request shape
  VALIDATION_ERROR: "Please correct the highlighted fields.",
  BAD_REQUEST: "That request could not be understood. Check the values and try again.",
  NOT_FOUND: "We could not find what you were looking for.",
  METHOD_NOT_ALLOWED: "That action is not supported here.",
  CONFLICT: "That change conflicts with existing data.",
  INTERNAL_ERROR: "Something went wrong on the server. Please try again.",
};

/** Preferred wording for an error, falling back to the backend's own message. */
export function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.errorCode && MESSAGES[error.errorCode]) return MESSAGES[error.errorCode];
    if (error.message) return error.message;
    return MESSAGES.INTERNAL_ERROR;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

/** Builds an ApiError from a non-2xx ApiResponse envelope. */
export function toApiError(status: number, body: unknown): ApiError {
  const envelope = body as ApiResponse<unknown> | null;
  const errorCode = envelope?.errorCode ?? null;

  // VALIDATION_ERROR puts { field: message } in data.
  let fieldErrors: Record<string, string> | null = null;
  if (errorCode === "VALIDATION_ERROR" && envelope?.data && typeof envelope.data === "object") {
    fieldErrors = envelope.data as Record<string, string>;
  }

  return new ApiError(
    envelope?.message ?? `Request failed with status ${status}`,
    status,
    errorCode,
    fieldErrors,
  );
}
