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
  membershipExpiry: {
    capability: "Automatic membership expiry and auto-renewal",
    suggestedEndpoint: "a scheduled job, no endpoint",
    status: "not-modelled",
    tables: ["student_membership"],
    note: "The expiring-soon list is now served by the reporting API, but nothing sweeps a past end date into EXPIRED and auto_renew is still stored without being acted on. The API reports `expired` derived from the end date so screens can flag it.",
  },
  notifications: {
    capability: "In-app notifications and delivery log",
    suggestedEndpoint: "GET /api/notifications",
    status: "not-modelled",
  },
  recentActivityFeeds: {
    capability: "Feeds of individual recent check-ins and receipts on the dashboard",
    suggestedEndpoint: "GET /api/libraries/{id}/attendance?limit=, /payments?limit=",
    status: "schema-only",
    tables: ["attendance", "payment"],
    note: "Reporting returns today's counts and totals, but no endpoint returns the most recent few rows for a dashboard feed. The detail screens list them in full instead.",
  },
  userDirectory: {
    capability: "Searching users who are not yet members, to add them to a tenant",
    suggestedEndpoint: "GET /api/users?search=",
    status: "schema-only",
    tables: ["users", "user_role"],
    note: "Membership endpoints exist and take a userId, but nothing lists or searches users. Library members can be picked from the organization member list; adding someone to an organization needs the numeric user id.",
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
  "GET/POST/PUT/DELETE /api/organizations/{id}/addresses",
  "GET/POST/PUT/DELETE /api/libraries/{id}/addresses",
  "GET/POST/PUT/DELETE /api/students/{id}/addresses",
  "GET/POST/PUT/DELETE /api/libraries/{id}/seats",
  "POST/DELETE /api/libraries/{id}/seats/{seatId}/allocation",
  "GET /api/libraries/{id}/seat-types, /seat-zones",
  "GET /api/students/{id}/seat-allocation",
  "GET/POST/DELETE /api/organizations/{id}/members",
  "GET/POST/DELETE /api/libraries/{id}/members",
  "PUT /api/organizations/{id}/members/{userId}/status, /primary",
  "PUT /api/libraries/{id}/members/{userId}/status, /primary",
  "GET/POST /api/libraries/{id}/student-memberships",
  "GET/PUT /api/student-memberships/{id}",
  "PUT /api/student-memberships/{id}/status",
  "POST /api/student-memberships/{id}/renew",
  "GET /api/students/{id}/memberships",
  "GET /api/libraries/{id}/attendance",
  "POST /api/libraries/{id}/attendance/check-in",
  "GET /api/attendance/{id}",
  "POST /api/attendance/{id}/check-out",
  "GET /api/students/{id}/attendance",
  "GET/POST /api/libraries/{id}/fee-plans",
  "GET/PUT /api/fee-plans/{id}, PUT /api/fee-plans/{id}/status",
  "GET/POST /api/libraries/{id}/student-fees",
  "GET /api/student-fees/{id}, GET /api/students/{id}/fees",
  "GET/POST /api/student-fees/{id}/payments",
  "GET /api/libraries/{id}/payments, /api/payments/{id}, /api/students/{id}/payments",
  "GET/POST /api/students/{id}/documents",
  "GET/PUT /api/student-documents/{id}",
  "GET/POST /api/students/{id}/emergency-contacts",
  "GET/PUT/DELETE /api/student-emergency-contacts/{id}",
  "GET /api/libraries/{id}/dashboard",
  "GET /api/libraries/{id}/reports/expiring-memberships?days=",
  "GET /api/libraries/{id}/reports/collection?from=&to=",
  "GET /api/libraries/{id}/reports/outstanding",
] as const;
