"use client";

import { IndianRupee } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useCollectionReport } from "@/hooks/use-reporting";
import { messageFor } from "@/lib/api-error";
import { formatMoney } from "@/lib/utils";

/**
 * Where recent money came from, by payment method.
 *
 * The backend groups and totals this, so nothing is added up here. Amounts are
 * rendered from the decimal strings the API returns and are never parsed into
 * JavaScript numbers for arithmetic.
 *
 * This is a breakdown rather than a list of individual receipts: no reporting
 * endpoint returns recent payments one by one, and inventing that list is not
 * something the API supports.
 */
export function CollectionBreakdownCard({
  libraryId,
  canView,
}: {
  libraryId: number | null;
  /** REPORT_VIEW. The backend re-checks. */
  canView: boolean;
}) {
  // No dates: the backend defaults to its own last-30-day window in the
  // library's timezone, which avoids a second definition of "recent" here.
  const query = useCollectionReport(libraryId, undefined, undefined, canView);
  const report = query.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collection by Method</CardTitle>
      </CardHeader>

      {!canView ? (
        <EmptyState
          icon={IndianRupee}
          title="Not available to your role"
          description="Viewing reports needs the report permission."
        />
      ) : query.isLoading ? (
        <LoadingState label="Loading collection…" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load collection"
          description={messageFor(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : !report || report.byMethod.length === 0 ? (
        <EmptyState
          icon={IndianRupee}
          title="No payments"
          description="Nothing has been received in this period."
        />
      ) : (
        <div className="p-5">
          <p className="text-2xl font-semibold tabular-nums text-ink">
            {formatMoney(report.totalCollected)}
          </p>
          <p className="mt-0.5 text-[12px] text-ink3">
            {report.paymentCount} receipt{report.paymentCount === 1 ? "" : "s"} since{" "}
            {report.fromDate}
          </p>

          <dl className="mt-4 space-y-2">
            {report.byMethod.map((row) => (
              <div key={row.paymentMethod} className="flex items-baseline justify-between gap-3">
                <dt className="text-[13px] text-ink3">{row.paymentMethod.replace("_", " ")}</dt>
                <dd className="text-sm font-medium tabular-nums text-ink">
                  {formatMoney(row.amount)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Card>
  );
}
