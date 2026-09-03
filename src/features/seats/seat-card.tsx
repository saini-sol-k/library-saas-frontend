"use client";

import { Armchair, Pencil, UserMinus, UserPlus, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SeatResponse } from "@/types/seat";

/**
 * One seat in the grid.
 *
 * Status is carried by colour and by a text label, so the grid stays readable
 * without relying on colour alone.
 */
const TONE: Record<string, { ring: string; icon: string; badge: "success" | "danger" | "warn" | "neutral" }> =
  {
    AVAILABLE: { ring: "border-ok-200 bg-ok-50/40", icon: "text-ok-600", badge: "success" },
    OCCUPIED: { ring: "border-danger-100 bg-danger-50/40", icon: "text-danger-600", badge: "danger" },
    MAINTENANCE: { ring: "border-warn-100 bg-warn-50/40", icon: "text-warn-600", badge: "warn" },
    INACTIVE: { ring: "border-line bg-linesoft/40", icon: "text-ink4", badge: "neutral" },
  };

export function SeatCard({
  seat,
  canManage,
  canAssign,
  onEdit,
  onAllocate,
  onRelease,
  onDeactivate,
}: {
  seat: SeatResponse;
  canManage: boolean;
  canAssign: boolean;
  onEdit: () => void;
  onAllocate: () => void;
  onRelease: () => void;
  onDeactivate: () => void;
}) {
  const tone = TONE[seat.status] ?? TONE.INACTIVE;
  const allocation = seat.currentAllocation;
  const isInactive = seat.status === "INACTIVE";

  return (
    <div className={cn("flex flex-col rounded-xl border p-4", tone.ring)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {seat.status === "MAINTENANCE" ? (
            <Wrench className={cn("h-4 w-4", tone.icon)} aria-hidden />
          ) : (
            <Armchair className={cn("h-4 w-4", tone.icon)} aria-hidden />
          )}
          <span className="font-mono text-sm font-semibold text-ink">{seat.seatNumber}</span>
        </div>
        <Badge tone={tone.badge}>
          {seat.status.charAt(0) + seat.status.slice(1).toLowerCase()}
        </Badge>
      </div>

      <div className="mt-2 min-h-9 text-[13px] text-ink3">
        {seat.zoneName ? <p>{seat.floor ? `${seat.zoneName} · ${seat.floor}` : seat.zoneName}</p> : null}
        {seat.seatTypeName ? <p>{seat.seatTypeName}</p> : null}
      </div>

      {allocation ? (
        <p className="mt-1 truncate text-sm text-ink">
          <span className="text-ink3">Held by </span>
          {allocation.studentName}
          <span className="text-ink3"> · {allocation.studentCode}</span>
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-linesoft pt-3">
        {canAssign && !allocation && !isInactive && seat.status !== "MAINTENANCE" ? (
          <Button size="sm" variant="secondary" onClick={onAllocate}>
            <UserPlus className="h-3.5 w-3.5" aria-hidden />
            Allocate
          </Button>
        ) : null}

        {canAssign && allocation ? (
          <Button size="sm" variant="secondary" onClick={onRelease}>
            <UserMinus className="h-3.5 w-3.5" aria-hidden />
            Release
          </Button>
        ) : null}

        {canManage ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            aria-label={`Edit seat ${seat.seatNumber}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </Button>
        ) : null}

        {canManage && !allocation && !isInactive ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDeactivate}
            aria-label={`Take seat ${seat.seatNumber} out of service`}
          >
            Retire
          </Button>
        ) : null}
      </div>
    </div>
  );
}
