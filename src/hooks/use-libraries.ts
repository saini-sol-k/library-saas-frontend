"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tenantService } from "@/services/tenant";
import type { LibrarySeatCountRequest } from "@/types/api";

/**
 * Changes a library's configured number of seats.
 *
 * Both the library list and the seat list are invalidated on success: the
 * library carries the new count, and the seats the backend just created or
 * withdrew would otherwise stay absent from a cached /seats view until the next
 * refetch. That invalidation is what makes the seat board reflect an increase
 * immediately.
 *
 * Errors are deliberately not toasted here. INVALID_SEAT_COUNT and
 * SEAT_COUNT_REDUCTION_BLOCKED both name a specific problem with the number that
 * was typed - and the reduction message names the seat standing in the way - so
 * the panel shows them against the field instead of in a toast that disappears.
 */
export function useUpdateSeatCount(libraryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: LibrarySeatCountRequest) => tenantService.updateSeatCount(libraryId, body),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
      queryClient.invalidateQueries({ queryKey: ["seats"] });

      // Counted by the backend rather than inferred from the difference: a seat
      // it brought back out of retirement and one it created are both additions,
      // and only it knows which happened.
      if (result.seatsAdded > 0) {
        toast.success(
          `${result.seatsAdded} ${plural(result.seatsAdded)} added successfully.`
            + (result.seatRange ? ` (${result.seatRange})` : ""),
        );
        return;
      }
      if (result.seatsWithdrawn > 0) {
        toast.success(`${result.seatsWithdrawn} ${plural(result.seatsWithdrawn)} removed successfully.`);
        return;
      }
      toast.success(`Number of seats is already ${result.seatCount}.`);
    },
  });
}

function plural(count: number) {
  return count === 1 ? "seat" : "seats";
}
