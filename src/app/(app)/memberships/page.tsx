import type { Metadata } from "next";
import { ApiGapNotice } from "@/components/ui/states";
import { PageHeader } from "@/layouts/app-shell";

export const metadata: Metadata = { title: "Memberships" };

export default function MembershipsPage() {
  return (
    <>
      <PageHeader title="Memberships" description="Student membership plans, activation and expiry." />
      <div className="max-w-3xl">
        <ApiGapNotice gap="studentMemberships" />
      </div>
    </>
  );
}
