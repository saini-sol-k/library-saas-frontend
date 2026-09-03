"use client";

import { FileText } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useStudentFees } from "@/hooks/use-finance";
import { messageFor } from "@/lib/api-error";
import { formatDate, formatMoney } from "@/lib/utils";

/**
 * One student's invoices and what they still owe.
 *
 * Read-only on purpose. Billing and taking payment belong on the payments
 * screen, where the library's plans and the whole ledger are in context;
 * repeating those controls here would mean repeating that context too.
 */
export function StudentFinanceCard({ studentId }: { studentId: number }) {
  const query = useStudentFees(Number.isFinite(studentId) ? studentId : null);
  const fees = query.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fees</CardTitle>
      </CardHeader>

      {query.isLoading ? (
        <LoadingState label="Loading fees…" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load fees"
          description={messageFor(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : fees.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices"
          description="This student has never been billed."
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Invoice</Th>
                <Th>Total</Th>
                <Th>Outstanding</Th>
                <Th>Due</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => (
                <Tr key={fee.studentFeeId}>
                  <Td className="font-mono text-[13px]">{fee.invoiceNumber}</Td>
                  <Td className="whitespace-nowrap">{formatMoney(fee.totalAmount)}</Td>
                  <Td className="whitespace-nowrap font-medium text-ink">
                    {formatMoney(fee.balanceAmount)}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {formatDate(fee.dueDate)}
                    {fee.overdue ? (
                      <Badge tone="danger" className="ml-2">
                        Overdue
                      </Badge>
                    ) : null}
                  </Td>
                  <Td>
                    <StatusBadge status={fee.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Card>
  );
}
