/**
 * Address contracts, mirroring the backend's AddressRequest / AddressResponse.
 *
 * Addresses are always reached through their owning resource - organization,
 * library or student - because the address table carries no tenant column.
 */

export type AddressOwner = "organizations" | "libraries" | "students";

/** Types the backend accepts for organizations and libraries. */
export const BUSINESS_ADDRESS_TYPES = ["BUSINESS", "BILLING", "SHIPPING", "OTHER"] as const;

/** Types the backend accepts for students. HOME is what the schema seeds. */
export const PERSONAL_ADDRESS_TYPES = [
  "HOME",
  "PERMANENT",
  "CURRENT",
  "CORRESPONDENCE",
  "OTHER",
] as const;

export type AddressType =
  | (typeof BUSINESS_ADDRESS_TYPES)[number]
  | (typeof PERSONAL_ADDRESS_TYPES)[number];

export interface AddressResponse {
  addressId: number;
  firstName: string | null;
  lastName: string | null;
  addressLine1: string;
  addressLine2: string | null;
  addressLine3: string | null;
  landmark: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  phone1: string | null;
  phone2: string | null;
  email: string | null;
  /** From the link table, not the address row. */
  addressType: string;
  isPrimary: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AddressRequest {
  firstName?: string;
  lastName?: string;
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  landmark?: string;
  city: string;
  district?: string;
  state: string;
  country?: string;
  postalCode: string;
  phone1?: string;
  phone2?: string;
  email?: string;
  addressType?: string;
  isPrimary?: boolean;
}

/** Single-line rendering for lists and summaries. */
export function formatAddress(address: AddressResponse): string {
  return [
    address.addressLine1,
    address.addressLine2,
    address.landmark,
    address.city,
    address.district,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}
