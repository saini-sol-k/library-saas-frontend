"use client";

import { CalendarCheck, LogIn } from "lucide-react";
import { useState } from "react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { CheckInForm } from "@/features/attendance/check-in-form";
import { useCheckIn, useCheckOut, useLibraryAttendance } from "@/hooks/use-attendance";
import { messageFor } from "@/lib/api-error";
import { formatDuration, formatTime } from "@/lib/utils";
import type { AttendanceStatus, CheckInRequest } from "@/types/api";

const STATUS_FILTERS: Array<{ value: "" | AttendanceStatus; label: string }> = [
  { value: "", label: "All visits" },
  { value: "PRESENT", label: "Still in" },
  { value: "COMPLETED", label: "Checked out" },
];

const today = () => new Date().toISOString().slice(0, 10);

/**
 * One day of a library's attendance, with the check-in and check-out controls.
 *
 * Serves both the desk screen and the history screen: `showCheckIn` decides
 * whether the day can be edited, so the two pages share one table rather than
 * duplicating it. Visits are never deleted, only closed.
 */
export function AttendanceBoard({
  libraryId,
  title,
  canManage,
  showCheckIn = true,
}: {
  libraryId: number;
  title: string;
  /** ATTENDANCE_CREATE. The backend re-checks. */
  canManage: boolean;
  showCheckIn?: boolean;
}) {
  const [date, setDate] = useState(today());
  const [statusFilter, setStatusFilter] = useState<"" | AttendanceStatus>("");
  const [checkingIn, setCheckingIn] = useState(false);

  const query = useLibraryAttendance(libraryId, date, statusFilter || undefined);
  const checkIn = useCheckIn(libraryId);
  const checkOut = useCheckOut();

  const rows = query.data ?? [];
  const isToday = date === today();
  // Checking someone in always records the current time, so it only makes
  // sense while today is on screen.
  const canCheckIn = canManage && showCheckIn && isToday;

  const closeForm = () => {
    setCheckingIn(false);
    checkIn.reset();
  };

  const submit = (body: CheckInRequest) => checkIn.mutate(body, { onSuccess: closeForm });

  return (
    <>
      <Card>
        <CardHeader
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                aria-label="Attendance date"
                className="h-9 w-auto"
                value={date}
                onChange={(event) => setDate(event.target.value || today())}
              />
              <Select
                aria-label="Filter by status"
                className="h-9 w-auto"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "" | AttendanceStatus)}
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value || "ALL"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {canCheckIn && rows.length > 0 ? (
                <Button variant="secondary" size="sm" onClick={() => setCheckingIn(true)}>
                  <LogIn className="h-4 w-4" aria-hidden />
                  Check in
                </Button>
              ) : null}
            </div>
          }
        >
          <CardTitle>{title}</CardTitle>
        </CardHeader>

        {query.isLoading ? (
          <LoadingState label="Loading attendance…" />
        ) : query.isError ? (
          <ErrorState
            title="Could not load attendance"
            description={messageFor(query.error)}
            onRetry={() => query.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No attendance"
            description={
              statusFilter
                ? "No visit on this day has that status."
                : isToday
                  ? "Nobody has checked in today yet."
                  : "Nobody checked in on this day."
            }
            action={
              canCheckIn ? (
                <Button size="sm" onClick={() => setCheckingIn(true)}>
                  <LogIn className="h-4 w-4" aria-hidden />
                  Check in
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Seat</Th>
                  <Th>Checked in</Th>
                  <Th>Checked out</Th>
                  <Th>Duration</Th>
                  <Th>Status</Th>
                  {canManage && showCheckIn ? <Th className="text-right">Actions</Th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <Tr key={row.attendanceId}>
                    <Td className="font-medium text-ink">
                      {row.studentName ?? `Student ${row.studentId}`}
                      {row.studentCode ? (
                        <span className="ml-1.5 font-mono text-[12px] text-ink3">
                          {row.studentCode}
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      {row.seatNumber ? (
                        <Badge tone="neutral">{row.seatNumber}</Badge>
                      ) : (
                        <span className="text-ink3">—</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">{formatTime(row.checkInTime)}</Td>
                    <Td className="whitespace-nowrap">
                      {row.checkOutTime ? formatTime(row.checkOutTime) : <span className="text-ink3">—</span>}
                    </Td>
                    <Td className="whitespace-nowrap">{formatDuration(row.durationMinutes)}</Td>
                    <Td>
                      <StatusBadge status={row.status} />
                    </Td>
                    {canManage && showCheckIn ? (
                      <Td className="text-right">
                        {row.open ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={checkOut.isPending}
                            onClick={() => checkOut.mutate(row.attendanceId)}
                          >
                            Check out
                          </Button>
                        ) : (
                          <span className="text-[13px] text-ink3">Closed</span>
                        )}
                      </Td>
                    ) : null}
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>

      {checkingIn ? (
        <Dialog open onClose={closeForm} title="Check a student in" className="max-w-lg">
          <CheckInForm
            libraryId={libraryId}
            submitting={checkIn.isPending}
            error={checkIn.error}
            onCancel={closeForm}
            onSubmit={submit}
          />
        </Dialog>
      ) : null}
    </>
  );
}
