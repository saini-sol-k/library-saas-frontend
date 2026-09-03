"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { ApiError, messageFor } from "@/lib/api-error";
import {
  GENDERS,
  pruneEmpty,
  STUDENT_STATUSES,
  studentCreateSchema,
  studentUpdateSchema,
  type StudentCreateValues,
} from "@/schemas/student";
import type { StudentResponse } from "@/types/api";

type Mode = "create" | "edit";

/**
 * Shared create/edit form.
 *
 * Backend validation is authoritative: a VALIDATION_ERROR response carries
 * { field: message } in `data`, and those messages are attached to the matching
 * inputs. Business codes such as STUDENT_CODE_ALREADY_EXISTS are pinned to the
 * field they concern rather than shown as a generic failure.
 */
export function StudentForm({
  mode,
  student,
  submitting,
  error,
  onSubmit,
}: {
  mode: Mode;
  student?: StudentResponse;
  submitting: boolean;
  error: unknown;
  onSubmit: (values: Record<string, unknown>) => void;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const form = useForm<StudentCreateValues>({
    resolver: zodResolver(isEdit ? (studentUpdateSchema as never) : studentCreateSchema),
    defaultValues: {
      studentCode: student?.studentCode ?? "",
      firstName: student?.firstName ?? "",
      lastName: student?.lastName ?? "",
      mobile: student?.mobile ?? "",
      email: student?.email ?? "",
      dateOfBirth: student?.dateOfBirth ?? "",
      gender: student?.gender ?? "",
      joiningDate: student?.joiningDate ?? new Date().toISOString().slice(0, 10),
      status: student?.status ?? "ACTIVE",
    },
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = form;

  // Map the backend's error onto the field it belongs to.
  useEffect(() => {
    if (!(error instanceof ApiError)) return;

    if (error.fieldErrors) {
      for (const [field, message] of Object.entries(error.fieldErrors)) {
        setError(field as keyof StudentCreateValues, { type: "server", message });
      }
      return;
    }
    if (error.errorCode === "STUDENT_CODE_ALREADY_EXISTS") {
      setError("studentCode", { type: "server", message: messageFor(error) });
    }
  }, [error, setError]);

  const formLevelError =
    error instanceof ApiError &&
    !error.fieldErrors &&
    error.errorCode !== "STUDENT_CODE_ALREADY_EXISTS"
      ? messageFor(error)
      : null;

  return (
    <form
      onSubmit={handleSubmit((values) => {
        const payload = pruneEmpty({ ...values });
        // studentCode is immutable on the backend's update DTO.
        if (isEdit) delete (payload as Record<string, unknown>).studentCode;
        onSubmit(payload);
      })}
      noValidate
    >
      <Card>
        <div className="p-5">
          {formLevelError ? (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-sm text-danger-700"
            >
              {formLevelError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Student code"
              htmlFor="studentCode"
              required={!isEdit}
              error={errors.studentCode?.message}
              hint={isEdit ? "Student code cannot be changed after creation" : undefined}
              className="sm:col-span-2"
            >
              <Input
                id="studentCode"
                disabled={isEdit}
                invalid={Boolean(errors.studentCode)}
                placeholder="STU001"
                {...register("studentCode")}
              />
            </Field>

            <Field label="First name" htmlFor="firstName" required error={errors.firstName?.message}>
              <Input id="firstName" invalid={Boolean(errors.firstName)} {...register("firstName")} />
            </Field>

            <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
              <Input id="lastName" invalid={Boolean(errors.lastName)} {...register("lastName")} />
            </Field>

            <Field label="Mobile" htmlFor="mobile" error={errors.mobile?.message}>
              <Input id="mobile" inputMode="tel" invalid={Boolean(errors.mobile)} {...register("mobile")} />
            </Field>

            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" invalid={Boolean(errors.email)} {...register("email")} />
            </Field>

            <Field label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth?.message}>
              <Input
                id="dateOfBirth"
                type="date"
                invalid={Boolean(errors.dateOfBirth)}
                {...register("dateOfBirth")}
              />
            </Field>

            <Field label="Gender" htmlFor="gender" error={errors.gender?.message}>
              <Select id="gender" invalid={Boolean(errors.gender)} {...register("gender")}>
                <option value="">Not specified</option>
                {GENDERS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Joining date"
              htmlFor="joiningDate"
              required
              error={errors.joiningDate?.message}
            >
              <Input
                id="joiningDate"
                type="date"
                invalid={Boolean(errors.joiningDate)}
                {...register("joiningDate")}
              />
            </Field>

            <Field label="Status" htmlFor="status" error={errors.status?.message}>
              <Select id="status" invalid={Boolean(errors.status)} {...register("status")}>
                {STUDENT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-linesoft px-5 py-3">
          <Button type="button" variant="secondary" onClick={() => router.back()} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? "Save changes" : "Add student"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
