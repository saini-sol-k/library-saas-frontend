import { apiClient } from "@/lib/api-client";
import type {
  SeatAllocationRequest,
  SeatAllocationResponse,
  SeatListFilters,
  SeatRequest,
  SeatResponse,
  SeatTypeResponse,
  SeatZoneResponse,
} from "@/types/seat";

/**
 * Seat API calls, nested under the owning library exactly as the backend
 * exposes them. Allocation is a sub-resource of the seat: POST creates one,
 * DELETE releases it.
 */
export const seatsService = {
  list: (libraryId: number, filters: SeatListFilters = {}) =>
    apiClient.get<SeatResponse[]>(`libraries/${libraryId}/seats`, { query: { ...filters } }),

  get: (libraryId: number, seatId: number) =>
    apiClient.get<SeatResponse>(`libraries/${libraryId}/seats/${seatId}`),

  create: (libraryId: number, body: SeatRequest) =>
    apiClient.post<SeatResponse>(`libraries/${libraryId}/seats`, body),

  update: (libraryId: number, seatId: number, body: SeatRequest) =>
    apiClient.put<SeatResponse>(`libraries/${libraryId}/seats/${seatId}`, body),

  /** Takes the seat out of service. The backend keeps the row. */
  deactivate: (libraryId: number, seatId: number) =>
    apiClient.delete<SeatResponse>(`libraries/${libraryId}/seats/${seatId}`),

  allocate: (libraryId: number, seatId: number, body: SeatAllocationRequest) =>
    apiClient.post<SeatAllocationResponse>(
      `libraries/${libraryId}/seats/${seatId}/allocation`,
      body,
    ),

  release: (libraryId: number, seatId: number) =>
    apiClient.delete<SeatAllocationResponse>(`libraries/${libraryId}/seats/${seatId}/allocation`),

  studentAllocation: (studentId: number) =>
    apiClient.get<SeatAllocationResponse | null>(`students/${studentId}/seat-allocation`),

  types: (libraryId: number) =>
    apiClient.get<SeatTypeResponse[]>(`libraries/${libraryId}/seat-types`),

  zones: (libraryId: number) =>
    apiClient.get<SeatZoneResponse[]>(`libraries/${libraryId}/seat-zones`),
};
