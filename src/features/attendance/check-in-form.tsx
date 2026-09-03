"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useSeats } from "@/hooks/use-seats";
import { useStudentList } from "@/hooks/use-students";
import { ApiError, messageFor } from "@/lib/api-error";
import { fullName } from "@/lib/utils";
import { checkInSchema, type CheckInValues } from "@/schemas/attendance";
import type { CheckInRequest } from "@/types/api";

/**
 * Check a student into the library.
 *
 * Students and seats both come from the existing library-scoped endpoints, so
 * neither picker can offer another tenant's records. The backend re-checks both
 * and answers STUDENT_NOT_IN_LIBRARY or SEAT_NOT_FOUND if one is forced.
 *
 * The seat is optional because the schema allows a visit without one. Left
 * blank, the backend records the student's current allocation if they hold one.
 */
export function CheckInForm({
  libraryId,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  libraryId: number;
  submitting: boolean;
  error: unknown;
  onSubmit: (body: CheckInRequest) => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

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
  const seats = useSeats(libraryId);

  const form = useForm<CheckInValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: { studentId: "", seatId: "" },
  });

  const apiError = error instanceof ApiError ? error : null;
  const fieldErrors = apiError?.fieldErrors ?? null;

  // A conflict about the person or the seat belongs on that field rather than
  // in a banner where the user has to work out what to change.
  const studentError =
    apiError &&
    ["STUDENT_NOT_FOUND", "STUDENT_NOT_IN_LIBRARY", "STUDENT_ALREADY_CHECKED_IN"].includes(
      apiError.errorCode ?? "",
    )
      ? messageFor(apiError)
      : null;
  const seatError = apiError?.errorCode === "SEAT_NOT_FOUND" ? messageFor(apiError) : null;

  const formLevelError =
    apiError && !studentError && !seatError && !fieldErrors ? messageFor(apiError) : null;

  const studentRows = students.data?.content ?? [];
  const seatRows = seats.data ?? [];

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        const body: CheckInRequest = { studentId: Number(values.studentId) };
        if (values.seatId) body.seatId = Number(values.seatId);
        onSubmit(body);
      })}
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
        <Field label="Find a student" htmlFor="checkInSearch">
          <Input
            id="checkInSearch"
            placeholder="Search by name or code"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>

        <Field
          label="Student"
          htmlFor="checkInStudentId"
          required
          error={
            form.formState.errors.studentId?.message ?? studentError ?? fieldErrors?.studentId
          }
          hint={
            students.isLoading
              ? "Loading students…"
              : studentRows.length === 0
                ? "No active student matches that search."
                : "Only students of this library can be checked in here."
          }
        >
          <Select
            id="checkInStudentId"
            invalid={Boolean(
              form.formState.errors.studentId?.message ?? studentError ?? fieldErrors?.studentId,
            )}
            disabled={studentRows.length === 0}
            {...form.register("studentId")}
          >
            <option value="">Select a student</option>
            {studentRows.map((student) => (
              <option key={student.id} value={String(student.id)}>
                {fullName(student.firstName, student.lastName) || student.studentCode}
                {student.studentCode ? ` · ${student.studentCode}` : ""}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Seat"
          htmlFor="checkInSeatId"
          error={seatError ?? fieldErrors?.seatId}
          hint="Optional. Left blank, the student's allocated seat is recorded if they have one."
        >
          <Select
            id="checkInSeatId"
            invalid={Boolean(seatError ?? fieldErrors?.seatId)}
            {...form.register("seatId")}
          >
            <option value="">Use their allocated seat</option>
            {seatRows.map((seat) => (
              <option key={seat.seatId} value={String(seat.seatId)}>
                {seat.seatNumber}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-linesoft pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Check in
        </Button>
      </div>
    </form>
  );
}
