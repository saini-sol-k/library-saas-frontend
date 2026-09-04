import { apiClient } from "@/lib/api-client";
import type { CustomerOnboardingRequest, CustomerOnboardingResponse } from "@/types/api";

/**
 * Platform administration. Super-admin only, enforced by the backend.
 *
 * There is one call and it is a write. No read is offered because none exists:
 * the initial password comes back from this request and from nowhere else, so
 * there is nothing to fetch later and no accidental second route to a secret.
 */
export const adminService = {
  onboardCustomer: (body: CustomerOnboardingRequest) =>
    apiClient.post<CustomerOnboardingResponse>("admin/customers", body),
};
