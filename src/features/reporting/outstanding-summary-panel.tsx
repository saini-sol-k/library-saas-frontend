"use client";

import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useOutstandingSummary } from "@/hooks/use-reporting";
import { messageFor } from "@/lib/api-error";
import { formatDate, formatMoney } from "@/lib/utils";

/**
 * What the library is still owed.
 *
 * Every figure is computed by the backend using the finance module's own rule,
 * invoiced less what successful payments have settled, so this screen and an
 * invoice balance can never disagree. Nothing is recalculated here, which also
 * means no monetary string is ever parsed into a JavaScript number.
 */
export function OutstandingSummaryPanel({ libraryId }: { libraryId: number }) {
  const query = useOutstandingSummary(libraryId);
  const summary = query.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding &amp; Overdue</CardTitle>
      </CardHeader>

      {query.isLoading ? (
        <LoadingState label="Loading outstanding balances…" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load outstanding balances"
          description={messageFor(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : !summary ? (
        <LoadingState label="Loading outstanding balances…" />
      ) : (
        <div className="p-5">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-line px-4 py-3">
              <dt className="text-[13px] text-ink3">Invoiced</dt>
              <dd className="text-xl font-semibold tabular-nums text-ink">
                {formatMoney(summary.totalInvoiced)}
              </dd>
              <p className="mt-0.5 text-[12px] text-ink3">
                {summary.invoiceCount} invoice{summary.invoiceCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-lg border border-line px-4 py-3">
              <dt className="text-[13px] text-ink3">Settled</dt>
              <dd className="text-xl font-semibold tabular-nums text-ink">
                {formatMoney(summary.totalSettled)}
              </dd>
              <p className="mt-0.5 text-[12px] text-ink3">Successful payments only</p>
            </div>
            <div className="rounded-lg border border-line px-4 py-3">
              <dt className="text-[13px] text-ink3">Outstanding</dt>
              <dd className="text-xl font-semibold tabular-nums text-ink">
                {formatMoney(summary.totalOutstanding)}
              </dd>
              <p className="mt-0.5 text-[12px] text-ink3">Invoiced less settled</p>
            </div>
            <div className="rounded-lg border border-line px-4 py-3">
              <dt className="flex items-center gap-2 text-[13px] text-ink3">
                Overdue
                {summary.overdueInvoiceCount > 0 ? (
                  <Badge tone="danger">{summary.overdueInvoiceCount}</Badge>
                ) : null}
              </dt>
              <dd className="text-xl font-semibold tabular-nums text-ink">
                {formatMoney(summary.overdueAmount)}
              </dd>
              <p className="mt-0.5 text-[12px] text-ink3">Past due with a balance</p>
            </div>
          </dl>

          <p className="mt-4 flex items-center gap-1.5 text-[12px] text-ink3">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            As at {formatDate(summary.asOfDate)} in {summary.timezone}
          </p>
        </div>
      )}
    </Card>
  );
}
