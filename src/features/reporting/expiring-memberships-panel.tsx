"use client";

import { UserCheck } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useExpiringMemberships } from "@/hooks/use-reporting";
import { messageFor } from "@/lib/api-error";
import { formatDate } from "@/lib/utils";
import { EXPIRY_WINDOW_DEFAULT_DAYS } from "@/types/api";

/**
 * Memberships approaching their end date.
 *
 * The default window is the backend's own, the 15 days the dashboard has asked
 * for since Phase 1, so this screen does not restate it as a request parameter
 * unless the user picks something else. The choices offered stay inside the
 * range the backend accepts, and the backend still validates whatever arrives.
 *
 * This lists rows and changes nothing. Nothing expires a membership: that
 * behaviour does not exist and is not implied here.
 */
const WINDOWS = [7, EXPIRY_WINDOW_DEFAULT_DAYS, 30, 90, 365];

export function ExpiringMembershipsPanel({ libraryId }: { libraryId: number }) {
  const [days, setDays] = useState<number>(EXPIRY_WINDOW_DEFAULT_DAYS);

  // The default is sent as undefined so the backend applies its own value
  // rather than this screen asserting a second source of truth for it.
  const query = useExpiringMemberships(
    libraryId,
    days === EXPIRY_WINDOW_DEFAULT_DAYS ? undefined : days,
  );
  const memberships = query.data ?? [];

  return (
    <Card>
      <CardHeader
        action={
          <Select
            aria-label="Expiry window in days"
            className="h-9 w-auto"
            value={String(days)}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            {WINDOWS.map((window) => (
              <option key={window} value={String(window)}>
                Next {window} days
              </option>
            ))}
          </Select>
        }
      >
        <CardTitle>Expiring Memberships</CardTitle>
      </CardHeader>

      {query.isLoading ? (
        <LoadingState label="Loading memberships…" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load expiring memberships"
          description={messageFor(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : memberships.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="Nothing expiring"
          description={`No membership ends in the next ${days} days.`}
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Membership</Th>
                <Th>Ends</Th>
                <Th>Remaining</Th>
                <Th>Auto-renew</Th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((membership) => (
                <Tr key={membership.membershipId}>
                  <Td className="font-medium text-ink">
                    {membership.studentName ?? `Student ${membership.studentId}`}
                    {membership.studentCode ? (
                      <span className="ml-1.5 font-mono text-[12px] text-ink3">
                        {membership.studentCode}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="font-mono text-[13px]">{membership.membershipNumber}</Td>
                  <Td className="whitespace-nowrap">{formatDate(membership.endDate)}</Td>
                  <Td>
                    <Badge tone={membership.daysRemaining <= 3 ? "danger" : "warn"}>
                      {membership.daysRemaining === 0
                        ? "Today"
                        : `${membership.daysRemaining} days`}
                    </Badge>
                  </Td>
                  <Td>
                    {membership.autoRenew ? (
                      <Badge tone="brand">On</Badge>
                    ) : (
                      <span className="text-ink3">—</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Card>
  );
}
