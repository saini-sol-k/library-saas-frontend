"use client";

import { Plus, ShieldCheck, UserMinus, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { MemberForm } from "@/features/memberships/member-form";
import {
  useAddMember,
  useMembers,
  useRemoveMember,
  useSetPrimaryMember,
  useUpdateMemberStatus,
} from "@/hooks/use-memberships";
import { messageFor } from "@/lib/api-error";
import { fullName } from "@/lib/utils";
import type { MembershipResponse, MembershipScope } from "@/types/api";

/**
 * Staff members of one organization or library.
 *
 * Deactivating keeps the membership row and its join date; removing deletes it
 * (and, for an organization, the user's libraries within it). Both are offered
 * because the backend treats them as different operations.
 */
export function MemberPanel({
  scope,
  tenantId,
  title,
  canManage,
  /** Active organization members, used as the candidate list for a library. */
  candidates,
  /** The signed-in user's username, so their own row can offer "Make primary". */
  currentUsername,
}: {
  scope: MembershipScope;
  tenantId: number;
  title: string;
  /** USER_CREATE / USER_UPDATE. The backend re-checks. */
  canManage: boolean;
  candidates?: MembershipResponse[];
  currentUsername?: string;
}) {
  const query = useMembers(scope, tenantId);
  const add = useAddMember(scope, tenantId);
  const updateStatus = useUpdateMemberStatus(scope, tenantId);
  const setPrimary = useSetPrimaryMember(scope, tenantId);
  const remove = useRemoveMember(scope, tenantId);

  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<MembershipResponse | null>(null);

  const members = query.data ?? [];
  const existingIds = members.map((m) => m.userId);

  const closeForm = () => {
    setAdding(false);
    add.reset();
  };

  return (
    <>
      <Card>
        <CardHeader
          action={
            canManage && members.length > 0 ? (
              <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                Add member
              </Button>
            ) : undefined
          }
        >
          <CardTitle>{title}</CardTitle>
        </CardHeader>

        {query.isLoading ? (
          <LoadingState label="Loading members…" />
        ) : query.isError ? (
          <ErrorState
            title="Could not load members"
            description={messageFor(query.error)}
            onRetry={() => query.refetch()}
          />
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members"
            description="Nobody currently belongs to this tenant."
            action={
              canManage ? (
                <Button size="sm" onClick={() => setAdding(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add member
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>User</Th>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <Th>Primary</Th>
                  {canManage ? <Th className="text-right">Actions</Th> : null}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const isActive = member.status === "ACTIVE";
                  const name = fullName(member.firstName ?? "", member.lastName);
                  // Only a user may promote their own membership, and only an
                  // active one, so the control appears nowhere else.
                  const isSelf =
                    currentUsername !== undefined && member.username === currentUsername;
                  const canPromote = isSelf && isActive && !member.isPrimary;

                  return (
                    <Tr key={member.userId}>
                      <Td className="font-medium text-ink">
                        {name || member.username || `User ${member.userId}`}
                        <span className="ml-1.5 font-mono text-[12px] text-ink3">
                          {member.username}
                        </span>
                      </Td>
                      <Td>{member.email || "—"}</Td>
                      <Td>
                        <StatusBadge status={member.status} />
                      </Td>
                      <Td>
                        {member.isPrimary ? (
                          <Badge tone="brand">
                            <ShieldCheck className="h-3 w-3" aria-hidden />
                            Primary
                          </Badge>
                        ) : (
                          <span className="text-ink3">—</span>
                        )}
                      </Td>
                      {canManage ? (
                        <Td className="text-right">
                          <div className="flex justify-end gap-1">
                            {canPromote ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={setPrimary.isPending}
                                onClick={() => setPrimary.mutate(member.userId)}
                              >
                                Make primary
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={updateStatus.isPending}
                              onClick={() =>
                                updateStatus.mutate({
                                  userId: member.userId,
                                  status: isActive ? "INACTIVE" : "ACTIVE",
                                })
                              }
                            >
                              {isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove ${member.username ?? "member"}`}
                              onClick={() => setRemoving(member)}
                            >
                              <UserMinus className="h-4 w-4 text-danger-600" aria-hidden />
                            </Button>
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

      {adding ? (
        <Dialog
          open
          onClose={closeForm}
          title={scope === "organizations" ? "Add organization member" : "Add library member"}
          className="max-w-lg"
        >
          <MemberForm
            scope={scope}
            candidates={candidates}
            existingUserIds={existingIds}
            submitting={add.isPending}
            error={add.error}
            onCancel={closeForm}
            onSubmit={(body) => add.mutate(body, { onSuccess: closeForm })}
          />
        </Dialog>
      ) : null}

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() =>
          removing && remove.mutate(removing.userId, { onSettled: () => setRemoving(null) })
        }
        loading={remove.isPending}
        title={removing ? `Remove ${removing.username ?? "this member"}?` : ""}
        description={
          scope === "organizations"
            ? "They lose access to this organization and to every library within it."
            : "They lose access to this library. Their organization membership is unaffected."
        }
        confirmLabel="Remove member"
        note="The membership record is deleted. To keep it, deactivate instead."
      />
    </>
  );
}

/** Icon re-exported so the settings page can label its section consistently. */
export { UserPlus as MemberIcon };
