"use client";

import { IndianRupee } from "lucide-react";
import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useCollectionReport } from "@/hooks/use-reporting";
import { messageFor } from "@/lib/api-error";
import { formatDate, formatMoney } from "@/lib/utils";

/**
 * Money received over a date range, by day and by method.
 *
 * Both breakdowns and the headline total are produced by the backend, which
 * groups by the library's own calendar day. Nothing is summed here, so the
 * decimal strings the API returns reach the screen unaltered.
 *
 * The range is sent as typed and validated by the backend, which refuses an
 * inverted or overlong range with its own error rather than this screen guessing
 * the limits.
 */
export function CollectionReportPanel({ libraryId }: { libraryId: number }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Empty dates are omitted so the backend applies its own default window.
  const query = useCollectionReport(libraryId, from || undefined, to || undefined);
  const report = query.data;

  return (
    <Card>
      <CardHeader
        action={
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="Collection from date"
              className="h-9 w-auto"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
            <Input
              type="date"
              aria-label="Collection to date"
              className="h-9 w-auto"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        }
      >
        <CardTitle>Collection</CardTitle>
      </CardHeader>

      {query.isLoading ? (
        <LoadingState label="Loading collection…" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load the collection report"
          description={messageFor(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : !report ? (
        <LoadingState label="Loading collection…" />
      ) : (
        <div className="p-5">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <p className="text-2xl font-semibold tabular-nums text-ink">
              {formatMoney(report.totalCollected)}
            </p>
            <p className="text-[13px] text-ink3">
              {report.paymentCount} receipt{report.paymentCount === 1 ? "" : "s"} from{" "}
              {formatDate(report.fromDate)} to {formatDate(report.toDate)} in {report.timezone}
            </p>
          </div>

          {report.byDay.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={IndianRupee}
                title="No payments in this period"
                description="Nothing was received between those dates."
              />
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div>
                <h3 className="mb-2 text-[13px] font-medium text-ink2">By day</h3>
                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Date</Th>
                        <Th>Receipts</Th>
                        <Th className="text-right">Amount</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byDay.map((row) => (
                        <Tr key={row.date}>
                          <Td className="whitespace-nowrap">{formatDate(row.date)}</Td>
                          <Td className="tabular-nums">{row.paymentCount}</Td>
                          <Td className="text-right font-medium tabular-nums text-ink">
                            {formatMoney(row.amount)}
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              </div>

              <div>
                <h3 className="mb-2 text-[13px] font-medium text-ink2">By method</h3>
                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Method</Th>
                        <Th>Receipts</Th>
                        <Th className="text-right">Amount</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byMethod.map((row) => (
                        <Tr key={row.paymentMethod}>
                          <Td>{row.paymentMethod.replace("_", " ")}</Td>
                          <Td className="tabular-nums">{row.paymentCount}</Td>
                          <Td className="text-right font-medium tabular-nums text-ink">
                            {formatMoney(row.amount)}
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
