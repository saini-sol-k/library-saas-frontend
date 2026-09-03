import { apiClient } from "@/lib/api-client";
import type {
  CollectionReportResponse,
  DashboardSummaryResponse,
  ExpiringMembershipResponse,
  OutstandingSummaryResponse,
} from "@/types/api";

/**
 * Reporting and dashboard metrics.
 *
 * Every endpoint is nested under the library it reports on, so the tenant is
 * fixed by the URL exactly as the backend expects. No header is sent and no
 * library is chosen here: the backend authorises the caller against that library
 * and puts its id inside every aggregate query.
 *
 * All four are reads. There is deliberately no write of any kind.
 */
export const reportingService = {
  /** One call for every dashboard figure, rather than counting lists in the browser. */
  getDashboard: (libraryId: number) =>
    apiClient.get<DashboardSummaryResponse>(`libraries/${libraryId}/dashboard`),

  /** Defaults to the backend's 15-day window when days is omitted. */
  getExpiringMemberships: (libraryId: number, days?: number) =>
    apiClient.get<ExpiringMembershipResponse[]>(
      `libraries/${libraryId}/reports/expiring-memberships`,
      { query: { days } },
    ),

  getCollectionReport: (libraryId: number, from?: string, to?: string) =>
    apiClient.get<CollectionReportResponse>(`libraries/${libraryId}/reports/collection`, {
      query: { from, to },
    }),

  getOutstandingSummary: (libraryId: number) =>
    apiClient.get<OutstandingSummaryResponse>(`libraries/${libraryId}/reports/outstanding`),
};
