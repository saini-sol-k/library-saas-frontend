"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ApiError, messageFor } from "@/lib/api-error";
import { seatSchema, type SeatValues } from "@/schemas/seat";
import {
  SETTABLE_SEAT_STATUSES,
  seatStatusLabel,
  type SeatRequest,
  type SeatResponse,
  type SeatTypeResponse,
  type SeatZoneResponse,
} from "@/types/seat";

/**
 * Create/edit form for a single seat.
 *
 * Zod covers shape and length; the backend stays authoritative for uniqueness
 * (SEAT_NUMBER_ALREADY_EXISTS) and the status rules (INVALID_SEAT_STATUS,
 * SEAT_HAS_ACTIVE_ALLOCATION), which are pinned to the field they concern.
 */
export function SeatForm({
  seat,
  zones,
  seatTypes,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  seat?: SeatResponse;
  zones: SeatZoneResponse[];
  seatTypes: SeatTypeResponse[];
  submitting: boolean;
  error: unknown;
  onSubmit: (body: SeatRequest) => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(seat);
  const isAllocated = Boolean(seat?.currentAllocation);

  const form = useForm<SeatValues>({
    resolver: zodResolver(seatSchema),
    defaultValues: {
      seatNumber: seat?.seatNumber ?? "",
      zoneId: seat?.zoneId != null ? String(seat.zoneId) : "",
      seatTypeId: seat?.seatTypeId != null ? String(seat.seatTypeId) : "",
      // An occupied seat has no settable status, so fall back to AVAILABLE for
      // the control; it is disabled and not sent while the seat is allocated.
      status: (SETTABLE_SEAT_STATUSES as readonly string[]).includes(seat?.status ?? "")
        ? (seat?.status as SeatValues["status"])
        : "AVAILABLE",
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
        setError(field as keyof SeatValues, { type: "server", message });
      }
      return;
    }
    if (error.errorCode === "SEAT_NUMBER_ALREADY_EXISTS") {
      setError("seatNumber", { type: "server", message: messageFor(error) });
    }
    if (error.errorCode === "INVALID_SEAT_STATUS" || error.errorCode === "SEAT_HAS_ACTIVE_ALLOCATION") {
      setError("status", { type: "server", message: messageFor(error) });
    }
  }, [error, setError]);

  const pinned =
    error instanceof ApiError &&
    ["SEAT_NUMBER_ALREADY_EXISTS", "INVALID_SEAT_STATUS", "SEAT_HAS_ACTIVE_ALLOCATION"].includes(
      error.errorCode ?? "",
    );

  const formLevelError =
    error instanceof ApiError && !error.fieldErrors && !pinned ? messageFor(error) : null;

  return (
    <form
      onSubmit={handleSubmit((values) => {
        const body: SeatRequest = {
          seatNumber: values.seatNumber,
          zoneId: values.zoneId ? Number(values.zoneId) : null,
          seatTypeId: values.seatTypeId ? Number(values.seatTypeId) : null,
        };
        // The backend rejects a status change on an allocated seat, so the
        // field is omitted rather than sent and refused.
        if (!isAllocated) body.status = values.status;
        onSubmit(body);
      })}
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
          label="Seat number"
          htmlFor="seatNumber"
          required
          error={errors.seatNumber?.message}
          hint="Must be unique within this library"
        >
          <Input
            id="seatNumber"
            invalid={Boolean(errors.seatNumber)}
            placeholder="A001"
            {...register("seatNumber")}
          />
        </Field>

        <Field
          label="Status"
          htmlFor="status"
          error={errors.status?.message}
          hint={
            isAllocated
              ? "This seat is allocated. Release it to change its status."
              : "A seat becomes Occupied by allocating it"
          }
        >
          <Select
            id="status"
            disabled={isAllocated}
            invalid={Boolean(errors.status)}
            {...register("status")}
          >
            {SETTABLE_SEAT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {seatStatusLabel(value)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Zone / floor" htmlFor="zoneId" error={errors.zoneId?.message}>
          <Select id="zoneId" invalid={Boolean(errors.zoneId)} {...register("zoneId")}>
            <option value="">Not assigned</option>
            {zones.map((zone) => (
              <option key={zone.zoneId} value={String(zone.zoneId)}>
                {zone.floor ? `${zone.name} — ${zone.floor}` : zone.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Seat type" htmlFor="seatTypeId" error={errors.seatTypeId?.message}>
          <Select id="seatTypeId" invalid={Boolean(errors.seatTypeId)} {...register("seatTypeId")}>
            <option value="">Not assigned</option>
            {seatTypes.map((type) => (
              <option key={type.seatTypeId} value={String(type.seatTypeId)}>
                {type.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-linesoft pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {isEdit ? "Save seat" : "Add seat"}
        </Button>
      </div>
    </form>
  );
}
