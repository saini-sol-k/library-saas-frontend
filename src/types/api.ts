/**
 * Types mirroring the Spring Boot contracts in LibraryManagementSAAS.
 * Every shape here was read off the backend DTOs, not invented.
 */

/** com.librarysaas.common.response.ApiResponse<T> */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errorCode: string | null;
}

/** Spring Data Page<T> as serialised by Jackson. */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

/* ------------------------------------------------------------------ auth */

/** POST /api/auth/login body. */
export interface LoginRequest {
  identifier: string;
  password: string;
}

/**
 * POST /api/auth/login -> data. The backend returns a plain Map, and
 * refreshToken/refreshExpiresInSec are only present when the user id resolves.
 */
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresInSec: number;
  refreshToken?: string;
  refreshExpiresInSec?: number;
}

/**
 * Claims the backend actually puts in the JWT: subject (username) and a
 * comma-separated authority list. There is no user id, name, org or library
 * claim, which is why tenant context is resolved through the tenant endpoints.
 */
export interface JwtClaims {
  sub: string;
  auth: string;
  iat: number;
  exp: number;
}

/* ---------------------------------------------------------- organization */

export interface OrganizationResponse {
  organizationId: number;
  organizationCode: string;
  name: string;
  legalName: string | null;
  email: string | null;
  mobile: string | null;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface OrganizationUpdateRequest {
  name?: string;
  legalName?: string;
  email?: string;
  mobile?: string;
  status?: string;
}

/* -------------------------------------------------------------- library */

export interface LibraryResponse {
  libraryId: number;
  organizationId: number | null;
  libraryCode: string;
  name: string;
  description: string | null;
  email: string | null;
  mobile: string | null;
  status: string;
  openingTime: string | null;
  closingTime: string | null;
  timezone: string | null;
  currency: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LibraryUpdateRequest {
  name?: string;
  description?: string;
  email?: string;
  mobile?: string;
  status?: string;
  timezone?: string;
  currency?: string;
  openingTime?: string;
  closingTime?: string;
}

/* -------------------------------------------------------------- student */

export interface StudentResponse {
  id: number;
  libraryId: number | null;
  studentCode: string;
  firstName: string;
  lastName: string | null;
  mobile: string | null;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  joiningDate: string;
  status: string;
  createdAt: string | null;
}

export interface StudentSummaryResponse {
  id: number;
  libraryId: number | null;
  studentCode: string;
  firstName: string;
  lastName: string | null;
  mobile: string | null;
  status: string;
}

export interface StudentCreateRequest {
  studentCode: string;
  firstName: string;
  lastName?: string;
  mobile?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  joiningDate: string;
  status?: string;
}

export interface StudentUpdateRequest {
  firstName: string;
  lastName?: string;
  mobile?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  joiningDate?: string;
  status?: string;
}

export interface StudentListParams {
  search?: string;
  status?: string;
  page?: number;
  size?: number;
}

/* ----------------------------------------------------------- membership */

/**
 * NOTE: the backend's MembershipController manages which *staff users* belong
 * to an organization or library. It is not student subscriptions - that domain
 * has a `student_membership` table but no Java layer. See lib/api-gaps.ts.
 */
export interface MembershipRequest {
  userId: number;
  isPrimary?: boolean;
}

/** Statuses a membership may hold. The backend rejects anything else. */
export const MEMBERSHIP_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export interface MembershipStatusRequest {
  status: MembershipStatus;
}

/**
 * One user's membership of one tenant. Exactly one of organizationId /
 * libraryId is populated, depending on which list it came from. The backend
 * maps only publishable user fields - never the password hash.
 */
export interface MembershipResponse {
  userId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  organizationId: number | null;
  libraryId: number | null;
  isPrimary: boolean;
  status: string;
  joinedAt: string | null;
}

/** Which tenant a membership list belongs to. */
export type MembershipScope = "organizations" | "libraries";

/* -------------------------------------------------------------------------- */
/* Student memberships                                                        */
/* -------------------------------------------------------------------------- */

/**
 * A student's dated entitlement to use a library.
 *
 * Distinct from MembershipResponse above, which records which staff users
 * belong to an organization or library. These two are different domains that
 * unfortunately share the word "membership", so the student side is prefixed
 * throughout.
 */
export const STUDENT_MEMBERSHIP_STATUSES = ["ACTIVE", "EXPIRED", "CANCELLED"] as const;
export type StudentMembershipStatus = (typeof STUDENT_MEMBERSHIP_STATUSES)[number];

export interface StudentMembershipResponse {
  membershipId: number;
  libraryId: number | null;
  studentId: number | null;
  studentCode: string | null;
  studentName: string | null;
  membershipNumber: string;
  startDate: string;
  endDate: string;
  status: string;
  autoRenew: boolean;
  /** Derived by the backend from the end date, independent of status. */
  expired: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  version: number | null;
}

/** Create payload. The library comes from the path, never the body. */
export interface StudentMembershipRequest {
  studentId: number;
  membershipNumber: string;
  startDate: string;
  endDate: string;
  autoRenew?: boolean;
}

/** The editable part of a membership, also used to describe a renewal period. */
export interface StudentMembershipUpdateRequest {
  membershipNumber: string;
  startDate: string;
  endDate: string;
  autoRenew?: boolean;
}

export interface StudentMembershipStatusRequest {
  status: StudentMembershipStatus;
}

/* -------------------------------------------------------------------------- */
/* Attendance                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Statuses a visit may hold. PRESENT is the schema default for an open visit;
 * COMPLETED is set on check-out. The backend rejects anything else.
 */
export const ATTENDANCE_STATUSES = ["PRESENT", "COMPLETED"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/**
 * One visit: a student checking into a library and, later, out again.
 *
 * `open` is derived by the backend from the absence of a check-out time, which
 * is what actually decides whether the visit is still running. Duration is
 * recorded in minutes on check-out and is null while open.
 */
export interface AttendanceResponse {
  attendanceId: number;
  libraryId: number | null;
  studentId: number | null;
  studentCode: string | null;
  studentName: string | null;
  seatId: number | null;
  seatNumber: string | null;
  attendanceDate: string;
  checkInTime: string;
  checkOutTime: string | null;
  durationMinutes: number | null;
  status: string;
  open: boolean;
}

/** Check a student in. The library comes from the path, never the body. */
export interface CheckInRequest {
  studentId: number;
  /** Optional. Must belong to the same library; defaults to the student's allocation. */
  seatId?: number;
}

/* -------------------------------------------------------------------------- */
/* Fees and payments                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Money crosses the wire as a decimal string, never a JavaScript number.
 *
 * The backend columns are DECIMAL(12,2) and the API serialises them exactly.
 * Parsing them into a float here would reintroduce the rounding the backend
 * carefully avoids, so amounts stay strings and are formatted for display
 * rather than arithmetic. The UI never computes a total or a balance; the
 * backend supplies both.
 */
export type Money = string;

export const FEE_PLAN_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type FeePlanStatus = (typeof FEE_PLAN_STATUSES)[number];

export interface FeePlanResponse {
  feePlanId: number;
  libraryId: number | null;
  name: string;
  description: string | null;
  amount: Money;
  durationValue: number;
  durationUnit: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface FeePlanRequest {
  name: string;
  description?: string;
  amount: Money;
  durationValue: number;
  durationUnit: string;
}

export interface FeePlanStatusRequest {
  status: FeePlanStatus;
}

/** PENDING, PARTIALLY_PAID and PAID are derived by the backend from payments. */
export const STUDENT_FEE_STATUSES = ["PENDING", "PARTIALLY_PAID", "PAID"] as const;
export type StudentFeeStatus = (typeof STUDENT_FEE_STATUSES)[number];

/**
 * One invoice. `paidAmount` and `balanceAmount` are computed by the backend
 * from the payments, so they are read and displayed, never recalculated here.
 */
export interface StudentFeeResponse {
  studentFeeId: number;
  libraryId: number | null;
  studentId: number | null;
  studentCode: string | null;
  studentName: string | null;
  membershipId: number | null;
  feePlanId: number | null;
  feePlanName: string | null;
  invoiceNumber: string;
  amount: Money;
  discountAmount: Money;
  taxAmount: Money;
  totalAmount: Money;
  paidAmount: Money;
  balanceAmount: Money;
  dueDate: string;
  status: string;
  overdue: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

/** The total is deliberately absent: the backend derives it from the parts. */
export interface StudentFeeRequest {
  studentId: number;
  feePlanId?: number;
  membershipId?: number;
  invoiceNumber: string;
  amount?: Money;
  discountAmount?: Money;
  taxAmount?: Money;
  dueDate: string;
}

export interface PaymentResponse {
  paymentId: number;
  libraryId: number | null;
  studentId: number | null;
  studentCode: string | null;
  studentName: string | null;
  studentFeeId: number | null;
  invoiceNumber: string | null;
  receiptNumber: string;
  amount: Money;
  paymentMethod: string;
  transactionReference: string | null;
  paymentDate: string;
  status: string;
}

/** The student and library are inherited from the invoice, never sent. */
export interface PaymentRequest {
  receiptNumber: string;
  amount: Money;
  paymentMethod: string;
  transactionReference?: string;
}
