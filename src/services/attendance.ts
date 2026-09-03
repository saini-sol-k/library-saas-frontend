import { apiClient } from "@/lib/api-client";
import type { AttendanceResponse, AttendanceStatus, CheckInRequest } from "@/types/api";

/**
 * Attendance: students checking into and out of a library.
 *
 * The day's list is nested under its library, exactly as the backend exposes
 * it, so every read is tenant-scoped by the URL. Single-visit calls sit at the
 * top level because an attendance id is globally unique.
 */
export const attendanceService = {
  listByLibrary: (libraryId: number, date?: string, status?: AttendanceStatus) =>
    apiClient.get<AttendanceResponse[]>(`libraries/${libraryId}/attendance`, {
      query: { date, status },
    }),

  listByStudent: (studentId: number) =>
    apiClient.get<AttendanceResponse[]>(`students/${studentId}/attendance`),

  get: (attendanceId: number) =>
    apiClient.get<AttendanceResponse>(`attendance/${attendanceId}`),

  checkIn: (libraryId: number, body: CheckInRequest) =>
    apiClient.post<AttendanceResponse>(`libraries/${libraryId}/attendance/check-in`, body),

  /** Closes an open visit and records its duration. There is no delete. */
  checkOut: (attendanceId: number) =>
    apiClient.post<AttendanceResponse>(`attendance/${attendanceId}/check-out`),
};
