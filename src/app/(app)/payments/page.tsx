"use client";

import { Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { FeePlanPanel } from "@/features/finance/fee-plan-panel";
import { PaymentList } from "@/features/finance/payment-list";
import { StudentFeePanel } from "@/features/finance/student-fee-panel";
import { PageHeader } from "@/layouts/app-shell";
import { useSession } from "@/providers/session-provider";

/**
 * Fees and payments for the active library.
 *
 * The three sections follow the money: the plans a library bills from, the
 * invoices raised, and the payments received. Each is gated on the permission it
 * actually needs, so a receptionist sees the ledger and can take payment without
 * the billing sections appearing at all.
 */
export default function PaymentsPage() {
  const { activeLibrary, tenantLoading, can } = useSession();

  const canViewBilling = can("FEE_PLAN_VIEW");
  const canBill = can("FEE_PLAN_CREATE");
  const canViewPayments = can("PAYMENT_VIEW");
  const canTakePayment = can("PAYMENT_CREATE");

  return (
    <>
      <PageHeader
        title="Payments"
        description="Fee plans, invoices, receipts and payment history."
      />

      {tenantLoading ? (
        <LoadingState label="Loading library…" />
      ) : !activeLibrary ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No library selected"
            description="Fees belong to a library. Choose one to see its billing."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {canViewBilling ? (
            <StudentFeePanel
              libraryId={activeLibrary.libraryId}
              title={`${activeLibrary.name} — Invoices`}
              canBill={canBill}
              canTakePayment={canTakePayment}
            />
          ) : null}

          {canViewPayments ? (
            <PaymentList
              libraryId={activeLibrary.libraryId}
              title={`${activeLibrary.name} — Payments received`}
            />
          ) : null}

          {canViewBilling ? (
            <FeePlanPanel
              libraryId={activeLibrary.libraryId}
              title={`${activeLibrary.name} — Fee plans`}
              canManage={canBill}
            />
          ) : null}
        </div>
      )}
    </>
  );
}
