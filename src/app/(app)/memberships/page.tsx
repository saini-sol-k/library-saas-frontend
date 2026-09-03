"use client";

import { Card } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { StudentMembershipPanel } from "@/features/student-memberships/student-membership-panel";
import { PageHeader } from "@/layouts/app-shell";
import { useSession } from "@/providers/session-provider";
import { Building2 } from "lucide-react";

/**
 * Student memberships for the active library.
 *
 * Memberships carry library_id, so the screen follows the library the user has
 * selected rather than offering a tenant picker of its own.
 */
export default function MembershipsPage() {
  const { activeLibrary, tenantLoading, can } = useSession();

  return (
    <>
      <PageHeader
        title="Memberships"
        description="Student memberships, their periods, renewals and expiry."
      />

      {tenantLoading ? (
        <LoadingState label="Loading library…" />
      ) : !activeLibrary ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No library selected"
            description="Memberships belong to a library. Choose one to see its memberships."
          />
        </Card>
      ) : (
        <StudentMembershipPanel
          libraryId={activeLibrary.libraryId}
          title={`${activeLibrary.name} — Student memberships`}
          canManage={can("STUDENT_UPDATE")}
        />
      )}
    </>
  );
}
