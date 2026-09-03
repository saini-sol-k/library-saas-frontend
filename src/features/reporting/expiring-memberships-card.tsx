"use client";

import { UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useExpiringMemberships } from "@/hooks/use-reporting";
import { messageFor } from "@/lib/api-error";
import { formatDate } from "@/lib/utils";
import { EXPIRY_WINDOW_DEFAULT_DAYS } from "@/types/api";

/**
 * Memberships approaching their end date.
 *
 * The window is left unset so the backend applies its own default of
 * {@link EXPIRY_WINDOW_DEFAULT_DAYS} days, the figure the dashboard has asked
 * for since Phase 1. This lists rows and changes nothing: there is no automatic
 * expiry behind it, and none is implied here.
 */
export function ExpiringMembershipsCard({
  libraryId,
  canView,
}: {
  libraryId: number | null;
  /** REPORT_VIEW. The backend re-checks. */
  canView: boolean;
}) {
  const query = useExpiringMemberships(libraryId, undefined, canView);
  const memberships = query.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expiring Memberships</CardTitle>
      </CardHeader>

      {!canView ? (
        <EmptyState
          icon={UserCheck}
          title="Not available to your role"
          description="Viewing reports needs the report permission."
        />
      ) : query.isLoading ? (
        <LoadingState label="Loading memberships…" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load memberships"
          description={messageFor(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : memberships.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="Nothing expiring"
          description={`No membership ends in the next ${EXPIRY_WINDOW_DEFAULT_DAYS} days.`}
        />
      ) : (
        <ul className="divide-y divide-linesoft">
          {memberships.slice(0, 6).map((membership) => (
            <li
              key={membership.membershipId}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {membership.studentName ?? `Student ${membership.studentId}`}
                </p>
                <p className="text-[12px] text-ink3">
                  <span className="font-mono">{membership.membershipNumber}</span> · ends{" "}
                  {formatDate(membership.endDate)}
                </p>
              </div>
              <Badge tone={membership.daysRemaining <= 3 ? "danger" : "warn"}>
                {membership.daysRemaining === 0
                  ? "Today"
                  : `${membership.daysRemaining}d`}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
