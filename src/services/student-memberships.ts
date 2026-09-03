import { apiClient } from "@/lib/api-client";
import type {
  StudentMembershipRequest,
  StudentMembershipResponse,
  StudentMembershipStatus,
  StudentMembershipUpdateRequest,
} from "@/types/api";

/**
 * A student's dated entitlement to use a library.
 *
 * The collection is nested under its library, exactly as the backend exposes
 * it, so every list is tenant-scoped by the URL. Single-resource calls sit at
 * the top level because a membership id is globally unique.
 *
 * This is not staff membership of a tenant - that is services/memberships.ts.
 */
export const studentMembershipsService = {
  listByLibrary: (libraryId: number, status?: StudentMembershipStatus) =>
    apiClient.get<StudentMembershipResponse[]>(`libraries/${libraryId}/student-memberships`, {
      query: { status },
    }),

  listByStudent: (studentId: number) =>
    apiClient.get<StudentMembershipResponse[]>(`students/${studentId}/memberships`),

  get: (membershipId: number) =>
    apiClient.get<StudentMembershipResponse>(`student-memberships/${membershipId}`),

  create: (libraryId: number, body: StudentMembershipRequest) =>
    apiClient.post<StudentMembershipResponse>(`libraries/${libraryId}/student-memberships`, body),

  update: (membershipId: number, body: StudentMembershipUpdateRequest) =>
    apiClient.put<StudentMembershipResponse>(`student-memberships/${membershipId}`, body),

  /** Cancelling keeps the row and its dates; there is no delete. */
  updateStatus: (membershipId: number, status: StudentMembershipStatus) =>
    apiClient.put<StudentMembershipResponse>(`student-memberships/${membershipId}/status`, {
      status,
    }),

  /** Creates a successor period and closes the previous one as EXPIRED. */
  renew: (membershipId: number, body: StudentMembershipUpdateRequest) =>
    apiClient.post<StudentMembershipResponse>(`student-memberships/${membershipId}/renew`, body),
};
