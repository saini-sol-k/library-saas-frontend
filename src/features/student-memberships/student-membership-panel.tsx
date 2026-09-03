"use client";

import { CalendarDays, Plus, RefreshCw, Repeat } from "lucide-react";
import { useState } from "react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/field";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import {
  StudentMembershipForm,
  type MembershipFormMode,
} from "@/features/student-memberships/student-membership-form";
import {
  useCreateStudentMembership,
  useLibraryStudentMemberships,
  useRenewStudentMembership,
  useUpdateStudentMembership,
  useUpdateStudentMembershipStatus,
} from "@/hooks/use-student-memberships";
import { useStudentList } from "@/hooks/use-students";
import { messageFor } from "@/lib/api-error";
import { fullName } from "@/lib/utils";
import type {
  StudentMembershipRequest,
  StudentMembershipResponse,
  StudentMembershipStatus,
  StudentMembershipUpdateRequest,
} from "@/types/api";

const STATUS_FILTERS: Array<{ value: "" | StudentMembershipStatus; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
];

/**
 * Student memberships of one library.
 *
 * Cancelling keeps the row and its dates, and renewing adds a successor rather
 * than rewriting the period, so the table is a history and not just a current
 * state. There is no delete, because the backend offers none.
 */
export function StudentMembershipPanel({
  libraryId,
  title,
  canManage,
}: {
  libraryId: number;
  title: string;
  /** STUDENT_UPDATE. The backend re-checks. */
  canManage: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<"" | StudentMembershipStatus>("");
  const query = useLibraryStudentMemberships(libraryId, statusFilter || undefined);

  const create = useCreateStudentMembership(libraryId);
  const update = useUpdateStudentMembership();
  const renew = useRenewStudentMembership();
  const updateStatus = useUpdateStudentMembershipStatus();

  const [formMode, setFormMode] = useState<MembershipFormMode | null>(null);
  const [target, setTarget] = useState<StudentMembershipResponse | null>(null);
  const [cancelling, setCancelling] = useState<StudentMembershipResponse | null>(null);

  // Candidates for a new membership. Only fetched when the form can be opened.
  const studentsQuery = useStudentList({ size: 100, status: "ACTIVE" });
  const students = (studentsQuery.data?.content ?? []).map((student) => ({
    studentId: student.id,
    studentCode: student.studentCode,
    name: fullName(student.firstName, student.lastName) || student.studentCode,
  }));

  const memberships = query.data ?? [];

  const activeMutation = formMode === "create" ? create : formMode === "edit" ? update : renew;

  const closeForm = () => {
    setFormMode(null);
    setTarget(null);
    create.reset();
    update.reset();
    renew.reset();
  };

  const openCreate = () => {
    create.reset();
    setTarget(null);
    setFormMode("create");
  };

  const openFor = (mode: MembershipFormMode, membership: StudentMembershipResponse) => {
    update.reset();
    renew.reset();
    setTarget(membership);
    setFormMode(mode);
  };

  const submitForm = (body: StudentMembershipRequest | StudentMembershipUpdateRequest) => {
    if (formMode === "create") {
      create.mutate(body as StudentMembershipRequest, { onSuccess: closeForm });
      return;
    }
    if (!target) return;

    const period = body as StudentMembershipUpdateRequest;
    if (formMode === "edit") {
      update.mutate({ membershipId: target.membershipId, body: period }, { onSuccess: closeForm });
    } else {
      renew.mutate({ membershipId: target.membershipId, body: period }, { onSuccess: closeForm });
    }
  };

  const dialogTitle =
    formMode === "create"
      ? "New student membership"
      : formMode === "edit"
        ? "Edit membership"
        : "Renew membership";

  return (
    <>
      <Card>
        <CardHeader
          action={
            <div className="flex items-center gap-2">
              <Select
                aria-label="Filter by status"
                className="h-9 w-auto"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "" | StudentMembershipStatus)
                }
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value || "ALL"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {canManage && memberships.length > 0 ? (
                <Button variant="secondary" size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" aria-hidden />
                  New membership
                </Button>
              ) : null}
            </div>
          }
        >
          <CardTitle>{title}</CardTitle>
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
            description={
              statusFilter
                ? "No membership has this status."
                : "No student holds a membership of this library yet."
            }
            action={
              canManage && !statusFilter ? (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" aria-hidden />
                  New membership
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Number</Th>
                  <Th>Period</Th>
                  <Th>Status</Th>
                  <Th>Auto-renew</Th>
                  {canManage ? <Th className="text-right">Actions</Th> : null}
                </tr>
              </thead>
              <tbody>
                {memberships.map((membership) => {
                  const isActive = membership.status === "ACTIVE";

                  return (
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
                      <Td className="whitespace-nowrap">
                        {membership.startDate} → {membership.endDate}
                        {/* Nothing sweeps memberships into EXPIRED, so an active
                            row whose period has passed is flagged here. */}
                        {membership.expired && isActive ? (
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
                      {canManage ? (
                        <Td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openFor("edit", membership)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openFor("renew", membership)}
                            >
                              <RefreshCw className="h-4 w-4" aria-hidden />
                              Renew
                            </Button>
                            {isActive ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCancelling(membership)}
                              >
                                Cancel
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={updateStatus.isPending}
                                onClick={() =>
                                  updateStatus.mutate({
                                    membershipId: membership.membershipId,
                                    status: "ACTIVE",
                                  })
                                }
                              >
                                Reactivate
                              </Button>
                            )}
                          </div>
                        </Td>
                      ) : null}
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>

      {formMode ? (
        <Dialog open onClose={closeForm} title={dialogTitle} className="max-w-lg">
          <StudentMembershipForm
            mode={formMode}
            students={formMode === "create" ? students : undefined}
            existing={target ?? undefined}
            submitting={activeMutation.isPending}
            error={activeMutation.error}
            onCancel={closeForm}
            onSubmit={submitForm}
          />
        </Dialog>
      ) : null}

      <ConfirmDialog
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        onConfirm={() =>
          cancelling &&
          updateStatus.mutate(
            { membershipId: cancelling.membershipId, status: "CANCELLED" },
            { onSettled: () => setCancelling(null) },
          )
        }
        loading={updateStatus.isPending}
        title={cancelling ? `Cancel membership ${cancelling.membershipNumber}?` : ""}
        description="The student stops being entitled to use this library under this membership."
        confirmLabel="Cancel membership"
        note="The record and its dates are kept, and it can be reactivated later."
      />
    </>
  );
}
