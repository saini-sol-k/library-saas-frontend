/**
 * Seat contracts, mirroring the backend's Seat* DTOs.
 *
 * Seats are always reached through the library that owns them, matching the
 * backend's nesting: seat, zone, type and assignment rows all carry library_id.
 */

/** Statuses the backend recognises. AVAILABLE/OCCUPIED/MAINTENANCE are seeded. */
export const SEAT_STATUSES = ["AVAILABLE", "OCCUPIED", "MAINTENANCE", "INACTIVE"] as const;

/**
 * Statuses a user may choose. OCCUPIED is excluded because the backend derives
 * it from an allocation and rejects it as INVALID_SEAT_STATUS.
 */
export const SETTABLE_SEAT_STATUSES = ["AVAILABLE", "MAINTENANCE", "INACTIVE"] as const;

export type SeatStatus = (typeof SEAT_STATUSES)[number];

export interface SeatAllocationResponse {
  assignmentId: number;
  seatId: number | null;
  seatNumber: string | null;
  studentId: number | null;
  studentCode: string | null;
  studentName: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
}

export interface SeatResponse {
  seatId: number;
  libraryId: number | null;
  seatNumber: string;
  status: string;
  zoneId: number | null;
  zoneName: string | null;
  floor: string | null;
  seatTypeId: number | null;
  seatTypeName: string | null;
  /** Null when the seat is not allocated. */
  currentAllocation: SeatAllocationResponse | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SeatRequest {
  seatNumber: string;
  zoneId?: number | null;
  seatTypeId?: number | null;
  status?: string;
}

export interface SeatAllocationRequest {
  studentId: number;
  startDate?: string;
}

export interface SeatTypeResponse {
  seatTypeId: number;
  name: string;
  description: string | null;
  price: number | null;
  status: string;
}

export interface SeatZoneResponse {
  zoneId: number;
  name: string;
  floor: string | null;
  description: string | null;
  status: string;
}

export interface SeatListFilters {
  status?: string;
  zoneId?: number;
  seatTypeId?: number;
  search?: string;
}

/** Human label for a seat status. */
export function seatStatusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

/** Counts by status, for the summary strip above the grid. */
export function summariseSeats(seats: SeatResponse[]) {
  return {
    total: seats.length,
    available: seats.filter((s) => s.status === "AVAILABLE").length,
    occupied: seats.filter((s) => s.status === "OCCUPIED").length,
    maintenance: seats.filter((s) => s.status === "MAINTENANCE").length,
    inactive: seats.filter((s) => s.status === "INACTIVE").length,
  };
}
