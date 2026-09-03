"use client";

import { Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { AttendanceBoard } from "@/features/attendance/attendance-board";
import { PageHeader } from "@/layouts/app-shell";
import { useSession } from "@/providers/session-provider";

/**
 * Attendance history for the active library, one day at a time.
 *
 * Read-only: the same board without its check-in controls, so recording a visit
 * stays on the desk screen where it belongs.
 */
export default function AttendancePage() {
  const { activeLibrary, tenantLoading, can } = useSession();

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Daily attendance history and study duration."
      />

      {tenantLoading ? (
        <LoadingState label="Loading library…" />
      ) : !activeLibrary ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No library selected"
            description="Attendance belongs to a library. Choose one to see its history."
          />
        </Card>
      ) : (
        <AttendanceBoard
          libraryId={activeLibrary.libraryId}
          title={`${activeLibrary.name} — Attendance`}
          canManage={can("ATTENDANCE_CREATE")}
          showCheckIn={false}
        />
      )}
    </>
  );
}
