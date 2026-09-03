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
  USER_ALREADY_IN_LIBRARY: "This user is already a member of the library.",
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
