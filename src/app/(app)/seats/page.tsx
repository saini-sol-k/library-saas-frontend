"use client";

import { Library as LibraryIcon, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { SeatBoard } from "@/features/seats/seat-board";
import { PageHeader } from "@/layouts/app-shell";
import { useSession } from "@/providers/session-provider";

/**
 * Seat management for the active library.
 *
 * Seats belong to a library on the backend, so the board follows whichever
 * library is active rather than showing a cross-tenant list.
 */
export default function SeatsPage() {
  const { activeLibrary, tenantLoading, can } = useSession();

  const canView = can("SEAT_VIEW");
  const canManage = can("SEAT_CREATE") || can("SEAT_UPDATE");
  const canAssign = can("SEAT_ASSIGN");

  return (
    <>
      <PageHeader
        title="Seats"
        description={
          activeLibrary
            ? `Seat inventory and allocation for ${activeLibrary.name}.`
            : "Seat inventory and allocation."
        }
      />

      {!canView ? (
        <Card>
          <EmptyState
            icon={Lock}
            title="You do not have access to seats"
            description="Your role does not include the seat permission. Ask an administrator if you need it."
          />
        </Card>
      ) : tenantLoading ? (
        <LoadingState label="Loading your library…" />
      ) : !activeLibrary ? (
        <Card>
          <EmptyState
            icon={LibraryIcon}
            title="No library selected"
            description="Seats belong to a library. Choose one in Settings to manage its seats."
          />
        </Card>
      ) : (
        <SeatBoard libraryId={activeLibrary.libraryId} canManage={canManage} canAssign={canAssign} />
      )}
    </>
  );
}
