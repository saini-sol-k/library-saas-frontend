"use client";

import { Armchair, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { SeatAllocationForm } from "@/features/seats/seat-allocation-form";
import { SeatCard } from "@/features/seats/seat-card";
import { SeatForm } from "@/features/seats/seat-form";
import {
  useAllocateSeat,
  useDeactivateSeat,
  useReleaseSeat,
  useSaveSeat,
  useSeatTypes,
  useSeatZones,
  useSeats,
} from "@/hooks/use-seats";
import { messageFor } from "@/lib/api-error";
import { SEAT_STATUSES, seatStatusLabel, summariseSeats, type SeatResponse } from "@/types/seat";

/**
 * Seat inventory and allocation for one library.
 *
 * Seats are nested under their library on the backend, so this board is driven
 * by the active library rather than by a global seat list.
 */
export function SeatBoard({
  libraryId,
  canManage,
  canAssign,
}: {
  libraryId: number;
  /** SEAT_CREATE / SEAT_UPDATE. The backend re-checks. */
  canManage: boolean;
  /** SEAT_ASSIGN, which the Receptionist role has without SEAT_UPDATE. */
  canAssign: boolean;
}) {
  const [status, setStatus] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<SeatResponse | "new" | null>(null);
  const [allocating, setAllocating] = useState<SeatResponse | null>(null);
  const [releasing, setReleasing] = useState<SeatResponse | null>(null);
  const [retiring, setRetiring] = useState<SeatResponse | null>(null);

  const query = useSeats(libraryId, {
    status: status || undefined,
    zoneId: zoneId ? Number(zoneId) : undefined,
    search: search || undefined,
  });
  const zones = useSeatZones(libraryId);
  const seatTypes = useSeatTypes(libraryId);

  const save = useSaveSeat(libraryId);
  const allocate = useAllocateSeat(libraryId);
  const release = useReleaseSeat(libraryId);
  const deactivate = useDeactivateSeat(libraryId);

  const seats = query.data ?? [];
  const counts = summariseSeats(seats);
  const hasFilters = Boolean(status || zoneId || search);

  const closeSeatForm = () => {
    setEditing(null);
    save.reset();
  };
  const closeAllocation = () => {
    setAllocating(null);
    allocate.reset();
  };

  return (
    <>
      <Card>
        <CardHeader
          action={
            canManage ? (
              <Button size="sm" onClick={() => setEditing("new")}>
                <Plus className="h-4 w-4" aria-hidden />
                Add seat
              </Button>
            ) : undefined
          }
        >
          <CardTitle>Seats</CardTitle>
        </CardHeader>

        {/* Summary strip: the counts people actually scan for. */}
        <dl className="grid grid-cols-2 gap-px border-b border-linesoft bg-linesoft sm:grid-cols-4">
          {[
            { label: "Total", value: counts.total },
            { label: "Available", value: counts.available },
            { label: "Occupied", value: counts.occupied },
            { label: "Out of service", value: counts.maintenance + counts.inactive },
          ].map((tile) => (
            <div key={tile.label} className="bg-surface px-5 py-3">
              <dt className="text-[13px] text-ink3">{tile.label}</dt>
              <dd className="text-lg font-semibold tabular-nums text-ink">{tile.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-2 border-b border-linesoft px-5 py-3 sm:flex-row">
          <Input
            aria-label="Search seat number"
            placeholder="Search seat number"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="sm:max-w-56"
          />
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="sm:max-w-44"
          >
            <option value="">All statuses</option>
            {SEAT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {seatStatusLabel(value)}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by zone"
            value={zoneId}
            onChange={(event) => setZoneId(event.target.value)}
            className="sm:max-w-44"
          >
            <option value="">All zones</option>
            {(zones.data ?? []).map((zone) => (
              <option key={zone.zoneId} value={String(zone.zoneId)}>
                {zone.name}
              </option>
            ))}
          </Select>
        </div>

        {query.isLoading ? (
          <LoadingState label="Loading seats…" />
        ) : query.isError ? (
          <ErrorState
            title="Could not load seats"
            description={messageFor(query.error)}
            onRetry={() => query.refetch()}
          />
        ) : seats.length === 0 ? (
          <EmptyState
            icon={Armchair}
            title={hasFilters ? "No seats match those filters" : "No seats yet"}
            description={
              hasFilters
                ? "Clear the filters to see the full inventory."
                : canManage
                  ? "Add the library's seats to start allocating them to students."
                  : "This library has no seats recorded."
            }
            action={
              hasFilters ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setStatus("");
                    setZoneId("");
                  }}
                >
                  Clear filters
                </Button>
              ) : canManage ? (
                <Button size="sm" onClick={() => setEditing("new")}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add seat
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {seats.map((seat) => (
              <SeatCard
                key={seat.seatId}
                seat={seat}
                canManage={canManage}
                canAssign={canAssign}
                onEdit={() => setEditing(seat)}
                onAllocate={() => setAllocating(seat)}
                onRelease={() => setReleasing(seat)}
                onDeactivate={() => setRetiring(seat)}
              />
            ))}
          </div>
        )}
      </Card>

      {editing ? (
        <Dialog
          open
          onClose={closeSeatForm}
          title={editing === "new" ? "Add seat" : `Edit seat ${editing.seatNumber}`}
          className="max-w-xl"
        >
          <SeatForm
            seat={editing === "new" ? undefined : editing}
            zones={zones.data ?? []}
            seatTypes={seatTypes.data ?? []}
            submitting={save.isPending}
            error={save.error}
            onCancel={closeSeatForm}
            onSubmit={(body) =>
              save.mutate(
                { seatId: editing === "new" ? undefined : editing.seatId, body },
                { onSuccess: closeSeatForm },
              )
            }
          />
        </Dialog>
      ) : null}

      {allocating ? (
        <Dialog open onClose={closeAllocation} title="Allocate seat" className="max-w-xl">
          <SeatAllocationForm
            seat={allocating}
            submitting={allocate.isPending}
            error={allocate.error}
            onCancel={closeAllocation}
            onSubmit={(body) =>
              allocate.mutate({ seatId: allocating.seatId, body }, { onSuccess: closeAllocation })
            }
          />
        </Dialog>
      ) : null}

      <ConfirmDialog
        open={releasing !== null}
        onClose={() => setReleasing(null)}
        onConfirm={() =>
          releasing && release.mutate(releasing.seatId, { onSettled: () => setReleasing(null) })
        }
        loading={release.isPending}
        title={releasing ? `Release seat ${releasing.seatNumber}?` : ""}
        description={
          releasing?.currentAllocation
            ? `${releasing.currentAllocation.studentName} will no longer hold this seat, and it returns to the available pool.`
            : ""
        }
        confirmLabel="Release seat"
        note="The seat can be allocated again straight away."
      />

      <ConfirmDialog
        open={retiring !== null}
        onClose={() => setRetiring(null)}
        onConfirm={() =>
          retiring && deactivate.mutate(retiring.seatId, { onSettled: () => setRetiring(null) })
        }
        loading={deactivate.isPending}
        title={retiring ? `Take seat ${retiring.seatNumber} out of service?` : ""}
        description="The seat is kept for its allocation history but can no longer be allocated."
        confirmLabel="Take out of service"
        note="You can put the seat back in service by editing it."
      />
    </>
  );
}
