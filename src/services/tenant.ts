import { apiClient } from "@/lib/api-client";
import type {
  LibraryResponse,
  LibraryUpdateRequest,
  OrganizationResponse,
  OrganizationUpdateRequest,
} from "@/types/api";

/**
 * Organization and library calls.
 *
 * Both list endpoints already return only the tenants the authenticated user is
 * an active member of, so they double as the source of tenant context: there is
 * no /api/auth/me to ask.
 */
export const tenantService = {
  listOrganizations: () => apiClient.get<OrganizationResponse[]>("organizations"),
  getOrganization: (id: number) => apiClient.get<OrganizationResponse>(`organizations/${id}`),
  updateOrganization: (id: number, body: OrganizationUpdateRequest) =>
    apiClient.put<OrganizationResponse>(`organizations/${id}`, body),

  /** Without organizationId this returns every library the user belongs to. */
  listLibraries: (organizationId?: number) =>
    apiClient.get<LibraryResponse[]>("libraries", {
      query: { organizationId },
    }),
  getLibrary: (id: number) => apiClient.get<LibraryResponse>(`libraries/${id}`),
  updateLibrary: (id: number, body: LibraryUpdateRequest) =>
    apiClient.put<LibraryResponse>(`libraries/${id}`, body),
};

export const authService = {
  login: async (identifier: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      const { toApiError } = await import("@/lib/api-error");
      throw toApiError(response.status, payload);
    }
    return true;
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
  },
};
