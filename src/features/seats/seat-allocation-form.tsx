"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useStudentList } from "@/hooks/use-students";
import { ApiError, messageFor } from "@/lib/api-error";
import { fullName } from "@/lib/utils";
import type { SeatAllocationRequest, SeatResponse } from "@/types/seat";

/**
 * Allocate a seat to a student.
 *
 * Students come from the existing paged student endpoint, already scoped to the
 * caller's library, so the picker cannot offer another tenant's students. The
 * backend still re-checks and answers STUDENT_NOT_FOUND if one is forced.
 */
export function SeatAllocationForm({
  seat,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  seat: SeatResponse;
  submitting: boolean;
  error: unknown;
  onSubmit: (body: SeatAllocationRequest) => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [studentId, setStudentId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const students = useStudentList({
    search: debounced || undefined,
    status: "ACTIVE",
    page: 0,
    size: 50,
  });

  const rows = students.data?.content ?? [];

  // A conflict is about the choice, so it sits next to the student field.
  const conflictCode =
    error instanceof ApiError &&
    ["SEAT_ALREADY_ALLOCATED", "STUDENT_ALREADY_HAS_SEAT", "STUDENT_NOT_FOUND", "SEAT_NOT_AVAILABLE"].includes(
      error.errorCode ?? "",
    )
      ? messageFor(error)
      : null;

  const formLevelError =
    error instanceof ApiError && !conflictCode ? messageFor(error) : null;

  const missingStudent = touched && !studentId ? "Choose a student" : undefined;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (!studentId) return;
        onSubmit({ studentId: Number(studentId), startDate: startDate || undefined });
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

      <p className="mb-4 text-sm text-ink2">
        Allocating seat <span className="font-medium text-ink">{seat.seatNumber}</span>
        {seat.zoneName ? ` in ${seat.zoneName}` : null}.
      </p>

      <div className="space-y-4">
        <Field label="Find a student" htmlFor="studentSearch">
          <Input
            id="studentSearch"
            placeholder="Search by name or mobile"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>

        <Field
          label="Student"
          htmlFor="studentId"
          required
          error={missingStudent ?? conflictCode ?? undefined}
          hint={
            students.isLoading
              ? "Loading students…"
              : rows.length === 0
                ? "No active students match that search"
                : undefined
          }
        >
          <Select
            id="studentId"
            invalid={Boolean(missingStudent ?? conflictCode)}
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            disabled={students.isLoading}
          >
            <option value="">Select a student</option>
            {rows.map((student) => (
              <option key={student.id} value={String(student.id)}>
                {fullName(student.firstName, student.lastName)} · {student.studentCode}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Start date" htmlFor="startDate" hint="Defaults to today">
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-linesoft pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Allocate seat
        </Button>
      </div>
    </form>
  );
}
