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
