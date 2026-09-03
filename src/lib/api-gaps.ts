/**
 * Registry of backend capabilities the UI needs but the API does not yet
 * provide. Screens read from here instead of inventing endpoints or mock data,
 * so every gap is stated once and shown to the user honestly.
 *
 * Established by reading the backend at commit 4900108: five controllers
 * (Auth, Organization, Library, Membership, Student). Several domains have a
 * database table from V1__initial_schema.sql but no entity, repository,
 * service or controller above it.
 */

export type GapStatus =
  /** Table exists in the schema; no Java layer above it. */
  | "schema-only"
  /** Neither table nor code exists. */
  | "not-modelled";

export interface ApiGap {
  /** What the UI wanted to call. */
  capability: string;
  /** The endpoint that would provide it. */
  suggestedEndpoint: string;
  status: GapStatus;
  /** Backing tables that already exist, if any. */
  tables?: string[];
  note?: string;
}

export const API_GAPS = {
  studentMemberships: {
    capability: "Student membership plans, activation and expiry",
    suggestedEndpoint: "GET/POST /api/students/{id}/memberships",
    status: "schema-only",
    tables: ["student_membership", "fee_plan"],
    note: "MembershipController exists but manages staff membership of organizations and libraries, not student subscriptions.",
  },
  seats: {
    capability: "Seat inventory, zones, types and live occupancy",
    suggestedEndpoint: "GET /api/libraries/{id}/seats",
    status: "schema-only",
    tables: ["seat", "seat_type", "seat_zone", "seat_assignment"],
  },
  attendance: {
    capability: "Check-in / check-out and attendance history",
    suggestedEndpoint: "POST /api/attendance/check-in, /check-out, GET /api/attendance",
    status: "schema-only",
    tables: ["attendance"],
  },
  payments: {
    capability: "Fee collection, receipts and payment history",
    suggestedEndpoint: "GET/POST /api/payments",
    status: "schema-only",
    tables: ["payment", "student_fee", "fee_plan"],
  },
  notifications: {
    capability: "In-app notifications and delivery log",
    suggestedEndpoint: "GET /api/notifications",
    status: "not-modelled",
  },
  reports: {
    capability: "Aggregated reporting and analytics",
    suggestedEndpoint: "GET /api/reports/*",
    status: "not-modelled",
  },
  dashboardMetrics: {
    capability: "Dashboard aggregates other than the student count",
    suggestedEndpoint: "GET /api/dashboard/summary",
    status: "not-modelled",
    note: "Total Students is derived from the existing paged student endpoint. Every other tile needs seats, attendance, memberships or payments first.",
  },
  currentUser: {
    capability: "Authenticated user's profile, roles and display name",
    suggestedEndpoint: "GET /api/auth/me",
    status: "not-modelled",
    note: "Login returns tokens only. The JWT carries sub (username) and auth (authorities), so the UI shows the username and derives permissions from the token.",
  },
} as const satisfies Record<string, ApiGap>;

export type ApiGapKey = keyof typeof API_GAPS;

/** Capabilities that ARE available today, for reference in the UI and docs. */
export const AVAILABLE_APIS = [
  "POST /api/auth/login",
  "POST /api/auth/refresh",
  "POST /api/auth/logout",
  "GET/POST/PUT/DELETE /api/organizations",
  "GET/POST/PUT/DELETE /api/libraries",
  "GET/POST/PUT/DELETE /api/students",
  "POST/DELETE /api/organizations/{id}/members",
  "POST/DELETE /api/libraries/{id}/members",
] as const;
