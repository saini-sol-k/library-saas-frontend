"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { messageFor } from "@/lib/api-error";
import { seatsService } from "@/services/seats";
import type { SeatAllocationRequest, SeatListFilters, SeatRequest } from "@/types/seat";

const KEY = "seats";

export function useSeats(libraryId: number | null, filters: SeatListFilters = {}) {
  return useQuery({
    queryKey: [KEY, "list", libraryId, filters],
    queryFn: () => seatsService.list(libraryId as number, filters),
    enabled: libraryId !== null && Number.isFinite(libraryId),
    placeholderData: (previous) => previous, // keeps the grid steady while filtering
  });
}

/** Reference data for the seat form. Rarely changes, so it is cached longer. */
export function useSeatTypes(libraryId: number | null) {
  return useQuery({
    queryKey: [KEY, "types", libraryId],
    queryFn: () => seatsService.types(libraryId as number),
    enabled: libraryId !== null && Number.isFinite(libraryId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSeatZones(libraryId: number | null) {
  return useQuery({
    queryKey: [KEY, "zones", libraryId],
    queryFn: () => seatsService.zones(libraryId as number),
    enabled: libraryId !== null && Number.isFinite(libraryId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentSeat(studentId: number | null) {
  return useQuery({
    queryKey: [KEY, "student", studentId],
    queryFn: () => seatsService.studentAllocation(studentId as number),
    enabled: studentId !== null && Number.isFinite(studentId),
  });
}

/** One mutation for create and update, so the caller needs no hook per seat. */
export function useSaveSeat(libraryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seatId, body }: { seatId?: number; body: SeatRequest }) =>
      seatId === undefined
        ? seatsService.create(libraryId, body)
        : seatsService.update(libraryId, seatId, body),
    onSuccess: (seat, variables) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success(
        variables.seatId === undefined ? `Seat ${seat.seatNumber} added` : `Seat ${seat.seatNumber} updated`,
      );
    },
    // Field- and code-level errors are shown on the form, so no error toast here.
  });
}

export function useDeactivateSeat(libraryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seatId: number) => seatsService.deactivate(libraryId, seatId),
    onSuccess: (seat) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success(`Seat ${seat.seatNumber} taken out of service`);
    },
    onError: (error) => toast.error(messageFor(error)),
  });
}

export function useAllocateSeat(libraryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seatId, body }: { seatId: number; body: SeatAllocationRequest }) =>
      seatsService.allocate(libraryId, seatId, body),
    onSuccess: (allocation) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success(`Seat ${allocation.seatNumber} allocated to ${allocation.studentName}`);
    },
    // Conflicts (seat taken, student already seated) are shown on the form.
  });
}

export function useReleaseSeat(libraryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seatId: number) => seatsService.release(libraryId, seatId),
    onSuccess: (allocation) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success(`Seat ${allocation.seatNumber} released`);
    },
    onError: (error) => toast.error(messageFor(error)),
  });
}
