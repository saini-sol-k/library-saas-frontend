"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ApiError, messageFor } from "@/lib/api-error";
import { addressSchema, type AddressValues } from "@/schemas/address";
import { pruneEmpty } from "@/schemas/student";
import type { AddressRequest, AddressResponse } from "@/types/address";

/**
 * Create/edit form for a single address.
 *
 * Zod covers shape and length so the user is told immediately, but the backend
 * stays authoritative: VALIDATION_ERROR field messages and the business codes
 * (INVALID_ADDRESS_TYPE, ADDRESS_TYPE_ALREADY_EXISTS) are pinned to the field
 * they concern instead of surfacing as a generic failure.
 */
export function AddressForm({
  address,
  addressTypes,
  takenTypes = [],
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  address?: AddressResponse;
  /** Types the backend accepts for this owner. */
  addressTypes: readonly string[];
  /** Types already used by this owner - the backend allows only one of each. */
  takenTypes?: string[];
  submitting: boolean;
  error: unknown;
  onSubmit: (body: AddressRequest) => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(address);

  const form = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      firstName: address?.firstName ?? "",
      lastName: address?.lastName ?? "",
      addressLine1: address?.addressLine1 ?? "",
      addressLine2: address?.addressLine2 ?? "",
      addressLine3: address?.addressLine3 ?? "",
      landmark: address?.landmark ?? "",
      city: address?.city ?? "",
      district: address?.district ?? "",
      state: address?.state ?? "",
      country: address?.country ?? "India",
      postalCode: address?.postalCode ?? "",
      phone1: address?.phone1 ?? "",
      phone2: address?.phone2 ?? "",
      email: address?.email ?? "",
      addressType:
        address?.addressType ??
        addressTypes.find((type) => !takenTypes.includes(type)) ??
        addressTypes[0],
      isPrimary: address?.isPrimary ?? false,
    },
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (!(error instanceof ApiError)) return;

    if (error.fieldErrors) {
      for (const [field, message] of Object.entries(error.fieldErrors)) {
        setError(field as keyof AddressValues, { type: "server", message });
      }
      return;
    }
    if (
      error.errorCode === "ADDRESS_TYPE_ALREADY_EXISTS" ||
      error.errorCode === "INVALID_ADDRESS_TYPE"
    ) {
      setError("addressType", { type: "server", message: messageFor(error) });
    }
  }, [error, setError]);

  const typePinned =
    error instanceof ApiError &&
    (error.errorCode === "ADDRESS_TYPE_ALREADY_EXISTS" ||
      error.errorCode === "INVALID_ADDRESS_TYPE");

  const formLevelError =
    error instanceof ApiError && !error.fieldErrors && !typePinned ? messageFor(error) : null;

  // The backend allows one address per type for every type, OTHER included.
  const typeTaken = (type: string) => !isEdit && takenTypes.includes(type);

  return (
    <form
      onSubmit={handleSubmit((values) =>
        onSubmit(
          pruneEmpty({
            ...values,
            // The link table keys on the type, so the backend keeps the existing
            // one on update. Send it back unchanged rather than a stale choice.
            addressType: address?.addressType ?? values.addressType,
          }) as unknown as AddressRequest,
        ),
      )}
      noValidate
    >
      {formLevelError ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-sm text-danger-700"
        >
          {formLevelError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Address type"
          htmlFor="addressType"
          required
          error={errors.addressType?.message}
          hint={
            isEdit
              ? "Address type cannot be changed. Remove the address and add it again to change it."
              : "Only one address of each type is allowed"
          }
        >
          <Select
            id="addressType"
            disabled={isEdit}
            invalid={Boolean(errors.addressType)}
            {...register("addressType")}
          >
            {addressTypes.map((type) => (
              <option key={type} value={type} disabled={typeTaken(type)}>
                {type.charAt(0) + type.slice(1).toLowerCase()}
                {typeTaken(type) ? " (already added)" : ""}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm text-ink2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line accent-brand-600"
              {...register("isPrimary")}
            />
            Use as the primary address
          </label>
        </div>

        <Field
          label="Address line 1"
          htmlFor="addressLine1"
          required
          error={errors.addressLine1?.message}
          className="sm:col-span-2"
        >
          <Input
            id="addressLine1"
            invalid={Boolean(errors.addressLine1)}
            placeholder="House or flat number and street"
            {...register("addressLine1")}
          />
        </Field>

        <Field
          label="Address line 2"
          htmlFor="addressLine2"
          error={errors.addressLine2?.message}
          className="sm:col-span-2"
        >
          <Input
            id="addressLine2"
            invalid={Boolean(errors.addressLine2)}
            {...register("addressLine2")}
          />
        </Field>

        <Field label="Landmark" htmlFor="landmark" error={errors.landmark?.message}>
          <Input id="landmark" invalid={Boolean(errors.landmark)} {...register("landmark")} />
        </Field>

        <Field label="City" htmlFor="city" required error={errors.city?.message}>
          <Input id="city" invalid={Boolean(errors.city)} {...register("city")} />
        </Field>

        <Field label="District" htmlFor="district" error={errors.district?.message}>
          <Input id="district" invalid={Boolean(errors.district)} {...register("district")} />
        </Field>

        <Field label="State" htmlFor="state" required error={errors.state?.message}>
          <Input id="state" invalid={Boolean(errors.state)} {...register("state")} />
        </Field>

        <Field label="Postal code" htmlFor="postalCode" required error={errors.postalCode?.message}>
          <Input
            id="postalCode"
            inputMode="numeric"
            invalid={Boolean(errors.postalCode)}
            {...register("postalCode")}
          />
        </Field>

        <Field label="Country" htmlFor="country" error={errors.country?.message}>
          <Input id="country" invalid={Boolean(errors.country)} {...register("country")} />
        </Field>

        <Field label="Phone" htmlFor="phone1" error={errors.phone1?.message}>
          <Input id="phone1" inputMode="tel" invalid={Boolean(errors.phone1)} {...register("phone1")} />
        </Field>

        <Field label="Alternate phone" htmlFor="phone2" error={errors.phone2?.message}>
          <Input id="phone2" inputMode="tel" invalid={Boolean(errors.phone2)} {...register("phone2")} />
        </Field>

        <Field
          label="Email"
          htmlFor="addressEmail"
          error={errors.email?.message}
          className="sm:col-span-2"
        >
          <Input
            id="addressEmail"
            type="email"
            invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-linesoft pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {isEdit ? "Save address" : "Add address"}
        </Button>
      </div>
    </form>
  );
}
