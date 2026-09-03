"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ApiError, messageFor } from "@/lib/api-error";
import type {
  StudentMembershipRequest,
  StudentMembershipResponse,
  StudentMembershipUpdateRequest,
} from "@/types/api";

export type MembershipFormMode = "create" | "edit" | "renew";

interface StudentOption {
  studentId: number;
  studentCode: string | null;
  name: string;
}

/**
 * Create, edit or renew a student membership.
 *
 * The three modes share a period, a membership number and the auto-renew flag.
 * Only create picks a student: an edit never moves a membership between
 * students, and a renewal inherits the student from the membership it succeeds,
 * which is exactly what the backend enforces.
 *
 * Field-level rules mirror the API contract rather than adding rules of their
 * own. The one client-side business check is that the end date must be after
 * the start date, because the user can see both fields at once and should not
 * need a round trip to be told.
 */
export function StudentMembershipForm({
  mode,
  students,
  existing,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  mode: MembershipFormMode;
  /** Candidates for a create. Members of this library only. */
  students?: StudentOption[];
  /** The membership being edited, or the one being renewed. */
  existing?: StudentMembershipResponse;
  submitting: boolean;
  error: unknown;
  onSubmit: (body: StudentMembershipRequest | StudentMembershipUpdateRequest) => void;
  onCancel: () => void;
}) {
  const isCreate = mode === "create";
  const isEdit = mode === "edit";

  const [studentId, setStudentId] = useState("");
  const [membershipNumber, setMembershipNumber] = useState(
    isEdit ? (existing?.membershipNumber ?? "") : "",
  );
  const [startDate, setStartDate] = useState(isEdit ? (existing?.startDate ?? "") : "");
  const [endDate, setEndDate] = useState(isEdit ? (existing?.endDate ?? "") : "");
  const [autoRenew, setAutoRenew] = useState(isEdit ? Boolean(existing?.autoRenew) : false);
  const [touched, setTouched] = useState(false);

  const apiError = error instanceof ApiError ? error : null;
  const fieldErrors = apiError?.fieldErrors ?? null;

  // A conflict about the number or the student belongs on that field, not in a
  // general banner where the user has to work out what to change.
  const numberError =
    apiError?.errorCode === "MEMBERSHIP_NUMBER_ALREADY_EXISTS" ? messageFor(apiError) : null;
  const studentError =
    apiError && ["STUDENT_NOT_FOUND", "STUDENT_NOT_IN_LIBRARY"].includes(apiError.errorCode ?? "")
      ? messageFor(apiError)
      : null;
  const periodError =
    apiError &&
    ["INVALID_MEMBERSHIP_PERIOD", "STUDENT_MEMBERSHIP_OVERLAP"].includes(apiError.errorCode ?? "")
      ? messageFor(apiError)
      : null;

  const formLevelError =
    apiError && !numberError && !studentError && !periodError && !fieldErrors
      ? messageFor(apiError)
      : null;

  const missingStudent = touched && isCreate && !studentId ? "Choose a student" : undefined;
  const missingNumber = touched && !membershipNumber.trim() ? "Enter a membership number" : undefined;
  const missingStart = touched && !startDate ? "Choose a start date" : undefined;
  const missingEnd = touched && !endDate ? "Choose an end date" : undefined;
  const badPeriod =
    touched && startDate && endDate && endDate <= startDate
      ? "The end date must be after the start date"
      : undefined;

  const submitLabel = isCreate ? "Create membership" : isEdit ? "Save changes" : "Renew membership";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);

        const number = membershipNumber.trim();
        if (!number || !startDate || !endDate || endDate <= startDate) return;
        if (isCreate && !studentId) return;

        const period: StudentMembershipUpdateRequest = {
          membershipNumber: number,
          startDate,
          endDate,
          autoRenew,
        };

        if (isCreate) {
          onSubmit({ ...period, studentId: Number(studentId) } as StudentMembershipRequest);
        } else {
          onSubmit(period);
        }
      }}
      noValidate
    >
      {formLevelError ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-sm text-danger-700"
        >
          {formLevelError}
        </div>
      ) : null}

      <div className="space-y-4">
        {isCreate ? (
          <Field
            label="Student"
            htmlFor="membershipStudentId"
            required
            error={missingStudent ?? studentError ?? fieldErrors?.studentId}
            hint={
              students && students.length === 0
                ? "This library has no students to enrol yet."
                : "Only students of this library can hold a membership here."
            }
          >
            <Select
              id="membershipStudentId"
              invalid={Boolean(missingStudent ?? studentError ?? fieldErrors?.studentId)}
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              disabled={!students || students.length === 0}
            >
              <option value="">Select a student</option>
              {(students ?? []).map((student) => (
                <option key={student.studentId} value={String(student.studentId)}>
                  {student.name}
                  {student.studentCode ? ` · ${student.studentCode}` : ""}
                </option>
              ))}
            </Select>
          </Field>
        ) : existing ? (
          <p className="text-sm text-ink2">
            {mode === "renew" ? "Renewing for " : "Editing the membership of "}
            <span className="font-medium text-ink">{existing.studentName ?? "this student"}</span>
            {existing.studentCode ? (
              <span className="ml-1 font-mono text-[12px] text-ink3">{existing.studentCode}</span>
            ) : null}
          </p>
        ) : null}

        <Field
          label="Membership number"
          htmlFor="membershipNumber"
          required
          error={missingNumber ?? numberError ?? fieldErrors?.membershipNumber}
          hint="Unique within this library."
        >
          <Input
            id="membershipNumber"
            placeholder="e.g. MEM004"
            maxLength={50}
            invalid={Boolean(missingNumber ?? numberError ?? fieldErrors?.membershipNumber)}
            value={membershipNumber}
            onChange={(event) => setMembershipNumber(event.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Start date"
            htmlFor="membershipStartDate"
            required
            error={missingStart ?? fieldErrors?.startDate}
          >
            <Input
              id="membershipStartDate"
              type="date"
              invalid={Boolean(missingStart ?? fieldErrors?.startDate)}
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </Field>

          <Field
            label="End date"
            htmlFor="membershipEndDate"
            required
            error={badPeriod ?? missingEnd ?? periodError ?? fieldErrors?.endDate}
          >
            <Input
              id="membershipEndDate"
              type="date"
              invalid={Boolean(badPeriod ?? missingEnd ?? periodError ?? fieldErrors?.endDate)}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line accent-brand-600"
            checked={autoRenew}
            onChange={(event) => setAutoRenew(event.target.checked)}
          />
          Mark for auto-renewal
        </label>
        <p className="-mt-2 text-[13px] text-ink3">
          Recorded on the membership. Nothing renews it automatically yet.
        </p>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-linesoft pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
