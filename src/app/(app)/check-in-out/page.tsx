import type { Metadata } from "next";
import { ApiGapNotice } from "@/components/ui/states";
import { PageHeader } from "@/layouts/app-shell";

export const metadata: Metadata = { title: "Check-In / Check-Out" };

export default function CheckInOutPage() {
  return (
    <>
      <PageHeader title="Check-In / Check-Out" description="Record students entering and leaving the library." />
      <div className="max-w-3xl">
        <ApiGapNotice gap="attendance" />
      </div>
    </>
  );
}
