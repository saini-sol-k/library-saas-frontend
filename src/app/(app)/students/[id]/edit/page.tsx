"use client";

import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { StudentForm } from "@/features/students/student-form";
import { useStudent, useUpdateStudent } from "@/hooks/use-students";
import { PageHeader } from "@/layouts/app-shell";
import { messageFor } from "@/lib/api-error";
import { fullName } from "@/lib/utils";
import type { StudentUpdateRequest } from "@/types/api";

export default function EditStudentPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const query = useStudent(Number.isFinite(id) ? id : null);
  const mutation = useUpdateStudent(id);

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

  return (
    <>
      <PageHeader
        title={`Edit ${fullName(student.firstName, student.lastName)}`}
        description={`Student code ${student.studentCode}`}
      />
      <div className="max-w-3xl">
        <StudentForm
          mode="edit"
          student={student}
          submitting={mutation.isPending}
          error={mutation.error}
          onSubmit={(values) => mutation.mutate(values as unknown as StudentUpdateRequest)}
        />
      </div>
    </>
  );
}
