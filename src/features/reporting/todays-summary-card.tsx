"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { messageFor } from "@/lib/api-error";
import { formatDate, formatMoney } from "@/lib/utils";
import type { DashboardSummaryResponse } from "@/types/api";

/**
 * The day at a glance, straight from the dashboard summary.
 *
 * The date shown is the library's own reporting day, as the backend computed it
 * from the library's timezone. It is displayed rather than recalculated: working
 * out "today" from the browser clock would disagree for a library in another
 * zone, and the backend is the single authority on that.
 */
export function TodaysSummaryCard({
  summary,
  isLoading,
  error,
  onRetry,
}: {
  summary?: DashboardSummaryResponse;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Summary</CardTitle>
      </CardHeader>

      {isLoading ? (
        <LoadingState label="Loading summary…" />
      ) : error ? (
        <ErrorState
          title="Could not load the summary"
          description={messageFor(error)}
          onRetry={onRetry}
        />
      ) : !summary ? (
        <LoadingState label="Loading summary…" />
      ) : (
        <div className="p-5">
          <dl className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[13px] text-ink3">Visits today</dt>
              <dd className="text-lg font-semibold tabular-nums text-ink">
                {summary.attendanceToday}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[13px] text-ink3">Currently inside</dt>
              <dd className="text-lg font-semibold tabular-nums text-ink">
                {summary.studentsCurrentlyInside}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[13px] text-ink3">Receipts today</dt>
              <dd className="text-lg font-semibold tabular-nums text-ink">
                {summary.paymentsToday}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-linesoft pt-3">
              <dt className="text-[13px] font-medium text-ink2">Collected today</dt>
              <dd className="text-lg font-semibold tabular-nums text-ink">
                {formatMoney(summary.collectionToday)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-[12px] text-ink3">
            {formatDate(summary.reportingDate)} in {summary.timezone}
          </p>
        </div>
      )}
    </Card>
  );
}
