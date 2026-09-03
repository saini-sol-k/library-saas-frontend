import { apiClient } from "@/lib/api-client";
import type {
  MembershipRequest,
  MembershipResponse,
  MembershipScope,
  MembershipStatus,
} from "@/types/api";

/**
 * Staff membership of a tenant, nested under the organization or library that
 * owns it exactly as the backend exposes it.
 *
 * This is not student subscriptions - that domain is still schema-only. See
 * lib/api-gaps.ts.
 */
export const membershipsService = {
  list: (scope: MembershipScope, tenantId: number) =>
    apiClient.get<MembershipResponse[]>(`${scope}/${tenantId}/members`),

  add: (scope: MembershipScope, tenantId: number, body: MembershipRequest) =>
    apiClient.post<null>(`${scope}/${tenantId}/members`, body),

  /** Activate or deactivate without deleting, so the join date survives. */
  updateStatus: (
    scope: MembershipScope,
    tenantId: number,
    userId: number,
    status: MembershipStatus,
  ) =>
    apiClient.put<MembershipResponse>(`${scope}/${tenantId}/members/${userId}/status`, { status }),

  /**
   * Promote an active membership to the user's primary tenant. The backend only
   * lets a user do this to their own membership, so the caller's id is still in
   * the path rather than implied.
   */
  setPrimary: (scope: MembershipScope, tenantId: number, userId: number) =>
    apiClient.put<null>(`${scope}/${tenantId}/members/${userId}/primary`),

  /** Permanent removal. Also drops the user's libraries when scope is organizations. */
  remove: (scope: MembershipScope, tenantId: number, userId: number) =>
    apiClient.delete<null>(`${scope}/${tenantId}/members/${userId}`),
};
