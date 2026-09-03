"use client";

import { useQuery } from "@tanstack/react-query";
import { reportingService } from "@/services/reporting";

const KEY = "reporting";

/**
 * Reporting reads.
 *
 * Every hook takes an explicit library id and stays idle until it has one, which
 * also lets a caller hold a query back when the user lacks REPORT_VIEW rather
 * than firing a request that is certain to be refused. The backend remains the
 * authority; this only avoids a pointless 403.
 *
 * There are no mutations here: reporting is read-only.
 */
export function useDashboardSummary(libraryId: number | null, enabled = true) {
  return useQuery({
    queryKey: [KEY, "dashboard", libraryId],
    queryFn: () => reportingService.getDashboard(libraryId as number),
    enabled: enabled && libraryId !== null && Number.isFinite(libraryId),
  });
}

/** Omitting days lets the backend apply its own 15-day default. */
export function useExpiringMemberships(
  libraryId: number | null,
  days?: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [KEY, "expiring", libraryId, days ?? "DEFAULT"],
    queryFn: () => reportingService.getExpiringMemberships(libraryId as number, days),
    enabled: enabled && libraryId !== null && Number.isFinite(libraryId),
  });
}

export function useCollectionReport(
  libraryId: number | null,
  from?: string,
  to?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: [KEY, "collection", libraryId, from ?? "DEFAULT", to ?? "DEFAULT"],
    queryFn: () => reportingService.getCollectionReport(libraryId as number, from, to),
    enabled: enabled && libraryId !== null && Number.isFinite(libraryId),
  });
}

export function useOutstandingSummary(libraryId: number | null, enabled = true) {
  return useQuery({
    queryKey: [KEY, "outstanding", libraryId],
    queryFn: () => reportingService.getOutstandingSummary(libraryId as number),
    enabled: enabled && libraryId !== null && Number.isFinite(libraryId),
  });
}
