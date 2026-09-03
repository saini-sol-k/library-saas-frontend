"use client";

import { CalendarDays, Repeat } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useStudentMembershipHistory } from "@/hooks/use-student-memberships";
import { messageFor } from "@/lib/api-error";

/**
 * One student's membership history, newest period first.
 *
 * Read-only on purpose. Memberships are created and changed from the library's
 * membership screen, where the number has to be unique and the period checked
 * against the rest of the library; repeating those controls here would mean
 * repeating that context too.
 */
export function StudentMembershipHistory({ studentId }: { studentId: number }) {
  const query = useStudentMembershipHistory(Number.isFinite(studentId) ? studentId : null);
  const memberships = query.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Memberships</CardTitle>
      </CardHeader>

      {query.isLoading ? (
        <LoadingState label="Loading memberships…" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load memberships"
          description={messageFor(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : memberships.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No memberships"
          description="This student has never held a membership of this library."
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Period</Th>
                <Th>Status</Th>
                <Th>Auto-renew</Th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((membership) => (
                <Tr key={membership.membershipId}>
                  <Td className="font-mono text-[13px]">{membership.membershipNumber}</Td>
                  <Td className="whitespace-nowrap">
                    {membership.startDate} → {membership.endDate}
                    {membership.expired && membership.status === "ACTIVE" ? (
                      <Badge tone="warn" className="ml-2">
                        Past end date
                      </Badge>
                    ) : null}
                  </Td>
                  <Td>
                    <StatusBadge status={membership.status} />
                  </Td>
                  <Td>
                    {membership.autoRenew ? (
                      <Badge tone="brand">
                        <Repeat className="h-3 w-3" aria-hidden />
                        On
                      </Badge>
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
