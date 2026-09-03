"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { messageFor } from "@/lib/api-error";
import { attendanceService } from "@/services/attendance";
import type { AttendanceStatus, CheckInRequest } from "@/types/api";

const KEY = "attendance";

export function useLibraryAttendance(
  libraryId: number | null,
  date?: string,
  status?: AttendanceStatus,
) {
  return useQuery({
    queryKey: [KEY, "library", libraryId, date ?? "TODAY", status ?? "ALL"],
    queryFn: () => attendanceService.listByLibrary(libraryId as number, date, status),
    enabled: libraryId !== null && Number.isFinite(libraryId),
  });
}

export function useStudentAttendance(studentId: number | null) {
  return useQuery({
    queryKey: [KEY, "student", studentId],
    queryFn: () => attendanceService.listByStudent(studentId as number),
    enabled: studentId !== null && Number.isFinite(studentId),
  });
}

export function useCheckIn(libraryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CheckInRequest) => attendanceService.checkIn(libraryId, body),
    onSuccess: (attendance) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success(`${attendance.studentName ?? "Student"} checked in`);
    },
    // Conflicts and not-found are shown on the form, next to the field at fault.
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attendanceId: number) => attendanceService.checkOut(attendanceId),
    onSuccess: (attendance) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success(`${attendance.studentName ?? "Student"} checked out`);
    },
    onError: (error) => toast.error(messageFor(error)),
  });
}
