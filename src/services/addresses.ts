import { apiClient } from "@/lib/api-client";
import type { AddressOwner, AddressRequest, AddressResponse } from "@/types/address";

/**
 * Address API calls, nested under the owning resource exactly as the backend
 * exposes them. One implementation serves organizations, libraries and
 * students so the logic is not duplicated per screen.
 */
export const addressesService = {
  list: (owner: AddressOwner, ownerId: number) =>
    apiClient.get<AddressResponse[]>(`${owner}/${ownerId}/addresses`),

  create: (owner: AddressOwner, ownerId: number, body: AddressRequest) =>
    apiClient.post<AddressResponse>(`${owner}/${ownerId}/addresses`, body),

  update: (owner: AddressOwner, ownerId: number, addressId: number, body: AddressRequest) =>
    apiClient.put<AddressResponse>(`${owner}/${ownerId}/addresses/${addressId}`, body),

  remove: (owner: AddressOwner, ownerId: number, addressId: number) =>
    apiClient.delete<null>(`${owner}/${ownerId}/addresses/${addressId}`),
};
