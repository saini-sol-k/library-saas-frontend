"use client";

import { Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { AttendanceBoard } from "@/features/attendance/attendance-board";
import { PageHeader } from "@/layouts/app-shell";
import { useSession } from "@/providers/session-provider";

/**
 * The desk screen: today's visits, with check-in and check-out.
 *
 * Attendance carries library_id, so the screen follows the library the user has
 * selected rather than offering a tenant picker of its own.
 */
export default function CheckInOutPage() {
  const { activeLibrary, tenantLoading, can } = useSession();

  return (
    <>
      <PageHeader
        title="Check-In / Check-Out"
        description="Record students entering and leaving the library."
      />

      {tenantLoading ? (
        <LoadingState label="Loading library…" />
      ) : !activeLibrary ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No library selected"
            description="Attendance belongs to a library. Choose one to record visits."
          />
        </Card>
      ) : (
        <AttendanceBoard
          libraryId={activeLibrary.libraryId}
          title={`${activeLibrary.name} — Today`}
          canManage={can("ATTENDANCE_CREATE")}
        />
      )}
    </>
  );
}
