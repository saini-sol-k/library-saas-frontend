"use client";

import { CalendarCheck } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useStudentAttendance } from "@/hooks/use-attendance";
import { messageFor } from "@/lib/api-error";
import { formatDate, formatDuration, formatTime } from "@/lib/utils";

/**
 * One student's visit history, newest first.
 *
 * Read-only on purpose. Checking someone in belongs on the desk screen, where
 * the whole day is visible and the seat picker has the library's seats in
 * context; repeating that control here would mean repeating that context.
 */
export function StudentAttendanceHistory({ studentId }: { studentId: number }) {
  const query = useStudentAttendance(Number.isFinite(studentId) ? studentId : null);
  const rows = query.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
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
          title="No visits"
          description="This student has never checked in."
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>In</Th>
                <Th>Out</Th>
                <Th>Duration</Th>
                <Th>Seat</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Tr key={row.attendanceId}>
                  <Td className="whitespace-nowrap">{formatDate(row.attendanceDate)}</Td>
                  <Td className="whitespace-nowrap">{formatTime(row.checkInTime)}</Td>
                  <Td className="whitespace-nowrap">
                    {row.checkOutTime ? formatTime(row.checkOutTime) : <span className="text-ink3">—</span>}
                  </Td>
                  <Td className="whitespace-nowrap">{formatDuration(row.durationMinutes)}</Td>
                  <Td>
                    {row.seatNumber ? (
                      <Badge tone="neutral">{row.seatNumber}</Badge>
                    ) : (
                      <span className="text-ink3">—</span>
                    )}
                  </Td>
                  <Td>
                    <StatusBadge status={row.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Card>
  );
}
