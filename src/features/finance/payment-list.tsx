"use client";

import { IndianRupee } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useLibraryPayments } from "@/hooks/use-finance";
import { messageFor } from "@/lib/api-error";
import { formatDateTime, formatMoney } from "@/lib/utils";

/**
 * A library's payment history, most recent first.
 *
 * Read-only by design: payments are append-only in the schema, which has no
 * updated_at to record an edit against, so there is nothing to offer here but
 * the record itself. Money is taken on the invoice screen, where the balance is
 * in view.
 */
export function PaymentList({ libraryId, title }: { libraryId: number; title: string }) {
  const query = useLibraryPayments(libraryId);
  const payments = query.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>

      {query.isLoading ? (
        <LoadingState label="Loading payments…" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load payments"
          description={messageFor(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={IndianRupee}
          title="No payments"
          description="No money has been received for this library yet."
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Receipt</Th>
                <Th>Student</Th>
                <Th>Invoice</Th>
                <Th>Amount</Th>
                <Th>Method</Th>
                <Th>Received</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <Tr key={payment.paymentId}>
                  <Td className="font-mono text-[13px]">{payment.receiptNumber}</Td>
                  <Td className="font-medium text-ink">
                    {payment.studentName ?? `Student ${payment.studentId}`}
                  </Td>
                  <Td className="font-mono text-[13px]">{payment.invoiceNumber ?? "—"}</Td>
                  <Td className="whitespace-nowrap font-medium text-ink">
                    {formatMoney(payment.amount)}
                  </Td>
                  <Td>{payment.paymentMethod}</Td>
                  <Td className="whitespace-nowrap">{formatDateTime(payment.paymentDate)}</Td>
                  <Td>
                    <StatusBadge status={payment.status} />
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
