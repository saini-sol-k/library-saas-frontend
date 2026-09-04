"use client";

import { useMutation } from "@tanstack/react-query";
import { adminService } from "@/services/admin";
import type { CustomerOnboardingRequest } from "@/types/api";

/**
 * Onboards a customer.
 *
 * The result is deliberately not written into the query cache and no queries are
 * invalidated: the response carries a one-time password, and putting it in a
 * cache would keep it in memory long after the screen that showed it is gone.
 * The calling component holds it in local state for as long as it is displayed
 * and nowhere else.
 */
export function useOnboardCustomer() {
  return useMutation({
    mutationFn: (body: CustomerOnboardingRequest) => adminService.onboardCustomer(body),
    gcTime: 0,
  });
}
