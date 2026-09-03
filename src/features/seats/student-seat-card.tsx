"use client";

import { Armchair } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useStudentSeat } from "@/hooks/use-seats";
import { messageFor } from "@/lib/api-error";
import { formatDate } from "@/lib/utils";

/**
 * The seat a student currently holds, shown on their detail page.
 *
 * Read-only: allocating and releasing happen on the seat board, where the rest
 * of the inventory is visible, so there is one place that action lives.
 */
export function StudentSeatCard({ studentId }: { studentId: number }) {
  const query = useStudentSeat(studentId);
  const allocation = query.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seat</CardTitle>
      </CardHeader>

      {query.isLoading ? (
        <LoadingState label="Loading seat…" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load the seat"
          description={messageFor(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : !allocation ? (
        <EmptyState
          icon={Armchair}
          title="No seat allocated"
          description="This student does not currently hold a seat."
          action={
            <Link href="/seats">
              <Button size="sm" variant="secondary">
                Go to seats
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Armchair className="h-4 w-4 text-ink4" aria-hidden />
              <span className="font-mono text-sm font-semibold text-ink">
                {allocation.seatNumber}
              </span>
            </div>
            <Badge tone="success">Active</Badge>
          </div>
          <p className="mt-2 text-[13px] text-ink3">
            Held since {formatDate(allocation.startDate)}
          </p>
          <Link href="/seats" className="mt-3 inline-block">
            <Button size="sm" variant="secondary">
              Manage on seat board
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
