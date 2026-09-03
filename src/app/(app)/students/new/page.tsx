"use client";

import { StudentForm } from "@/features/students/student-form";
import { useCreateStudent } from "@/hooks/use-students";
import { PageHeader } from "@/layouts/app-shell";
import type { StudentCreateRequest } from "@/types/api";

export default function NewStudentPage() {
  const mutation = useCreateStudent();

  return (
    <>
      <PageHeader
        title="Add Student"
        description="The student is registered against your currently active library."
      />
      <div className="max-w-3xl">
        <StudentForm
          mode="create"
          submitting={mutation.isPending}
          error={mutation.error}
          onSubmit={(values) => mutation.mutate(values as unknown as StudentCreateRequest)}
        />
      </div>
    </>
  );
}
