"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { AddressPanel } from "@/features/addresses/address-panel";
import { StudentAttendanceHistory } from "@/features/attendance/student-attendance-history";
import { StudentSeatCard } from "@/features/seats/student-seat-card";
import { StudentMembershipHistory } from "@/features/student-memberships/student-membership-history";
import { useDeleteStudent, useStudent } from "@/hooks/use-students";
import { PageHeader } from "@/layouts/app-shell";
import { messageFor } from "@/lib/api-error";
import { formatDate, fullName } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-linesoft py-3 last:border-0 sm:flex-row sm:items-center sm:gap-4">
      <dt className="w-44 shrink-0 text-[13px] text-ink3">{label}</dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { can } = useSession();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const query = useStudent(Number.isFinite(id) ? id : null);
  const remove = useDeleteStudent();

  if (query.isLoading) return <LoadingState label="Loading student…" />;

  if (query.isError) {
    return (
      <Card>
        <ErrorState
          title="Could not load this student"
          description={messageFor(query.error)}
          onRetry={() => query.refetch()}
        />
      </Card>
    );
  }

  const student = query.data;
  if (!student) return null;

  const name = fullName(student.firstName, student.lastName);

  return (
    <>
      <PageHeader
        title={name}
        description={`Student code ${student.studentCode}`}
        actions={
          <>
            {can("STUDENT_UPDATE") ? (
              <Link href={`/students/${student.id}/edit`}>
                <Button variant="secondary">
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit
                </Button>
              </Link>
            ) : null}
            {can("STUDENT_DELETE") ? (
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Student Details</CardTitle>
            </CardHeader>
            <div className="px-5 py-2">
              <dl>
                <Row label="Student code" value={<span className="font-mono">{student.studentCode}</span>} />
                <Row label="Full name" value={name} />
                <Row label="Mobile" value={student.mobile || "—"} />
                <Row label="Email" value={student.email || "—"} />
                <Row label="Date of birth" value={formatDate(student.dateOfBirth)} />
                <Row label="Gender" value={student.gender || "—"} />
                <Row label="Joining date" value={formatDate(student.joiningDate)} />
                <Row label="Status" value={<StatusBadge status={student.status} />} />
                <Row label="Library" value={student.libraryId ?? "—"} />
                <Row label="Registered" value={formatDate(student.createdAt)} />
              </dl>
            </div>
          </Card>

          <AddressPanel owner="students" ownerId={student.id} canEdit={can("STUDENT_UPDATE")} />
        </div>

        <div className="space-y-4">
          {can("SEAT_VIEW") ? <StudentSeatCard studentId={student.id} /> : null}

          {can("STUDENT_VIEW") ? <StudentMembershipHistory studentId={student.id} /> : null}

          {can("ATTENDANCE_VIEW") ? <StudentAttendanceHistory studentId={student.id} /> : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => remove.mutate(student.id)}
        loading={remove.isPending}
        title={`Delete ${name}?`}
        description="The student record will be removed from this library."
        confirmLabel="Delete student"
      />
    </>
  );
}
