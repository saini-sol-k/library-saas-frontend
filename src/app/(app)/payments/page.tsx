import type { Metadata } from "next";
import { ApiGapNotice } from "@/components/ui/states";
import { PageHeader } from "@/layouts/app-shell";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" description="Fee collection, receipts and payment history." />
      <div className="max-w-3xl">
        <ApiGapNotice gap="payments" />
      </div>
    </>
  );
}
