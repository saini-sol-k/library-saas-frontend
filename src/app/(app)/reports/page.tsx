"use client";

import { Building2, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { CollectionReportPanel } from "@/features/reporting/collection-report-panel";
import { ExpiringMembershipsPanel } from "@/features/reporting/expiring-memberships-panel";
import { OutstandingSummaryPanel } from "@/features/reporting/outstanding-summary-panel";
import { PageHeader } from "@/layouts/app-shell";
import { useSession } from "@/providers/session-provider";

/**
 * Reports for the active library.
 *
 * Reporting is library-scoped, so the page follows the library the user has
 * selected rather than offering a tenant picker, and there is no
 * organization-level rollup. Every section needs REPORT_VIEW, which the backend
 * enforces regardless of what is rendered here.
 */
export default function ReportsPage() {
  const { activeLibrary, tenantLoading, can } = useSession();
  const canReport = can("REPORT_VIEW");

  return (
    <>
      <PageHeader title="Reports" description="Operational and financial reporting." />

      {tenantLoading ? (
        <LoadingState label="Loading library…" />
      ) : !canReport ? (
        <Card>
          <EmptyState
            icon={Lock}
            title="Reports are not available to your role"
            description="Viewing reports needs the report permission. Ask an administrator if you need access."
          />
        </Card>
      ) : !activeLibrary ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No library selected"
            description="Reports belong to a library. Choose one to see its figures."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <OutstandingSummaryPanel libraryId={activeLibrary.libraryId} />
          <CollectionReportPanel libraryId={activeLibrary.libraryId} />
          <ExpiringMembershipsPanel libraryId={activeLibrary.libraryId} />
        </div>
      )}
    </>
  );
}
