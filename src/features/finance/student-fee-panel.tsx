"use client";

import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/field";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { PaymentForm } from "@/features/finance/payment-form";
import { StudentFeeForm } from "@/features/finance/student-fee-form";
import { useCreateStudentFee, useLibraryFees, useRecordPayment } from "@/hooks/use-finance";
import { messageFor } from "@/lib/api-error";
import { formatDate, formatMoney } from "@/lib/utils";
import type {
  PaymentRequest,
  StudentFeeRequest,
  StudentFeeResponse,
  StudentFeeStatus,
} from "@/types/api";

const STATUS_FILTERS: Array<{ value: "" | StudentFeeStatus; label: string }> = [
  { value: "", label: "All invoices" },
  { value: "PENDING", label: "Pending" },
  { value: "PARTIALLY_PAID", label: "Partly paid" },
  { value: "PAID", label: "Paid" },
];

/**
 * A library's invoices, with what is owed and the control to take payment.
 *
 * Every amount shown comes from the backend, which computes the total from the
 * invoice parts and the balance from the payments. Nothing here does arithmetic
 * on money.
 *
 * Raising an invoice needs the billing permission while taking payment needs the
 * payment one, and the two are gated separately because the roles genuinely
 * differ: a receptionist may bank money without being able to bill for it.
 */
export function StudentFeePanel({
  libraryId,
  title,
  canBill,
  canTakePayment,
}: {
  libraryId: number;
  title: string;
  /** FEE_PLAN_CREATE. The backend re-checks. */
  canBill: boolean;
  /** PAYMENT_CREATE. The backend re-checks. */
  canTakePayment: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<"" | StudentFeeStatus>("");
  const query = useLibraryFees(libraryId, statusFilter || undefined);
  const create = useCreateStudentFee(libraryId);
  const pay = useRecordPayment();

  const [raising, setRaising] = useState(false);
  const [paying, setPaying] = useState<StudentFeeResponse | null>(null);

  const fees = query.data ?? [];

  const closeRaise = () => {
    setRaising(false);
    create.reset();
  };
  const closePay = () => {
    setPaying(null);
    pay.reset();
  };

  const submitInvoice = (body: StudentFeeRequest) =>
    create.mutate(body, { onSuccess: closeRaise });

  const submitPayment = (body: PaymentRequest) => {
    if (!paying) return;
    pay.mutate({ studentFeeId: paying.studentFeeId, body }, { onSuccess: closePay });
  };

  return (
    <>
      <Card>
        <CardHeader
          action={
            <div className="flex items-center gap-2">
              <Select
                aria-label="Filter invoices by status"
                className="h-9 w-auto"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "" | StudentFeeStatus)}
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value || "ALL"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {canBill && fees.length > 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    create.reset();
                    setRaising(true);
                  }}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Raise invoice
                </Button>
              ) : null}
            </div>
          }
        >
          <CardTitle>{title}</CardTitle>
        </CardHeader>

        {query.isLoading ? (
          <LoadingState label="Loading invoices…" />
        ) : query.isError ? (
          <ErrorState
            title="Could not load invoices"
            description={messageFor(query.error)}
            onRetry={() => query.refetch()}
          />
        ) : fees.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices"
            description={
              statusFilter ? "No invoice has that status." : "Nothing has been billed yet."
            }
            action={
              canBill && !statusFilter ? (
                <Button size="sm" onClick={() => setRaising(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Raise invoice
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Student</Th>
                  <Th>Total</Th>
                  <Th>Paid</Th>
                  <Th>Outstanding</Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                  {canTakePayment ? <Th className="text-right">Actions</Th> : null}
                </tr>
              </thead>
              <tbody>
                {fees.map((fee) => {
                  const settled = fee.status === "PAID";
                  return (
                    <Tr key={fee.studentFeeId}>
                      <Td className="font-mono text-[13px]">{fee.invoiceNumber}</Td>
                      <Td className="font-medium text-ink">
                        {fee.studentName ?? `Student ${fee.studentId}`}
                        {fee.studentCode ? (
                          <span className="ml-1.5 font-mono text-[12px] text-ink3">
                            {fee.studentCode}
                          </span>
                        ) : null}
                      </Td>
                      <Td className="whitespace-nowrap">{formatMoney(fee.totalAmount)}</Td>
                      <Td className="whitespace-nowrap">{formatMoney(fee.paidAmount)}</Td>
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
                      {canTakePayment ? (
                        <Td className="text-right">
                          {settled ? (
                            <span className="text-[13px] text-ink3">Settled</span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                pay.reset();
                                setPaying(fee);
                              }}
                            >
                              Take payment
                            </Button>
                          )}
                        </Td>
                      ) : null}
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>

      {raising ? (
        <Dialog open onClose={closeRaise} title="Raise an invoice" className="max-w-lg">
          <StudentFeeForm
            libraryId={libraryId}
            submitting={create.isPending}
            error={create.error}
            onCancel={closeRaise}
            onSubmit={submitInvoice}
          />
        </Dialog>
      ) : null}

      {paying ? (
        <Dialog open onClose={closePay} title="Record a payment" className="max-w-lg">
          <PaymentForm
            fee={paying}
            submitting={pay.isPending}
            error={pay.error}
            onCancel={closePay}
            onSubmit={submitPayment}
          />
        </Dialog>
      ) : null}
    </>
  );
}
