"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { messageFor } from "@/lib/api-error";
import { addressesService } from "@/services/addresses";
import type { AddressOwner, AddressRequest } from "@/types/address";

const KEY = "addresses";

export function useAddresses(owner: AddressOwner, ownerId: number | null) {
  return useQuery({
    queryKey: [KEY, owner, ownerId],
    queryFn: () => addressesService.list(owner, ownerId as number),
    enabled: ownerId !== null && Number.isFinite(ownerId),
  });
}

/**
 * One mutation for both create and update: the address being edited is chosen
 * at submit time, so the caller does not need a hook instance per address.
 */
export function useSaveAddress(owner: AddressOwner, ownerId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ addressId, body }: { addressId?: number; body: AddressRequest }) =>
      addressId === undefined
        ? addressesService.create(owner, ownerId, body)
        : addressesService.update(owner, ownerId, addressId, body),
    onSuccess: (_address, variables) => {
      queryClient.invalidateQueries({ queryKey: [KEY, owner, ownerId] });
      toast.success(variables.addressId === undefined ? "Address added" : "Address updated");
    },
    // Field- and code-level errors are rendered on the form next to the input
    // that caused them, so there is deliberately no error toast here.
  });
}

export function useDeleteAddress(owner: AddressOwner, ownerId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addressId: number) => addressesService.remove(owner, ownerId, addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY, owner, ownerId] });
      toast.success("Address removed");
    },
    onError: (error) => toast.error(messageFor(error)),
  });
}
