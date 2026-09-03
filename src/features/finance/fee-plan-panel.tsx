"use client";

import { Plus, Receipt } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { FeePlanForm } from "@/features/finance/fee-plan-form";
import { useCreateFeePlan, useFeePlans, useUpdateFeePlan, useUpdateFeePlanStatus } from "@/hooks/use-finance";
import { messageFor } from "@/lib/api-error";
import { formatMoney } from "@/lib/utils";
import type { FeePlanRequest, FeePlanResponse } from "@/types/api";

/**
 * The priced plans a library bills from.
 *
 * Retiring a plan keeps the row, because invoices reference it; there is no
 * delete to offer. A retired plan cannot be billed against, which the backend
 * enforces.
 */
export function FeePlanPanel({
  libraryId,
  title,
  canManage,
}: {
  libraryId: number;
  title: string;
  /** FEE_PLAN_CREATE. The backend re-checks. */
  canManage: boolean;
}) {
  const query = useFeePlans(libraryId);
  const create = useCreateFeePlan(libraryId);
  const update = useUpdateFeePlan();
  const updateStatus = useUpdateFeePlanStatus();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<FeePlanResponse | null>(null);

  const plans = query.data ?? [];
  const activeMutation = editing ? update : create;

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    create.reset();
    update.reset();
  };

  const submit = (body: FeePlanRequest) => {
    if (editing) {
      update.mutate({ feePlanId: editing.feePlanId, body }, { onSuccess: closeForm });
    } else {
      create.mutate(body, { onSuccess: closeForm });
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          action={
            canManage && plans.length > 0 ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  create.reset();
                  setCreating(true);
                }}
              >
                <Plus className="h-4 w-4" aria-hidden />
                New fee plan
              </Button>
            ) : undefined
          }
        >
          <CardTitle>{title}</CardTitle>
        </CardHeader>

        {query.isLoading ? (
          <LoadingState label="Loading fee plans…" />
        ) : query.isError ? (
          <ErrorState
            title="Could not load fee plans"
            description={messageFor(query.error)}
            onRetry={() => query.refetch()}
          />
        ) : plans.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No fee plans"
            description="This library has no priced plans yet."
            action={
              canManage ? (
                <Button size="sm" onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  New fee plan
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Amount</Th>
                  <Th>Duration</Th>
                  <Th>Status</Th>
                  {canManage ? <Th className="text-right">Actions</Th> : null}
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => {
                  const isActive = plan.status === "ACTIVE";
                  return (
                    <Tr key={plan.feePlanId}>
                      <Td className="font-medium text-ink">
                        {plan.name}
                        {plan.description ? (
                          <span className="ml-1.5 text-[12px] text-ink3">{plan.description}</span>
                        ) : null}
                      </Td>
                      <Td className="whitespace-nowrap">{formatMoney(plan.amount)}</Td>
                      <Td className="whitespace-nowrap">
                        {plan.durationValue} {plan.durationUnit}
                      </Td>
                      <Td>
                        <StatusBadge status={plan.status} />
                      </Td>
                      {canManage ? (
                        <Td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                update.reset();
                                setEditing(plan);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={updateStatus.isPending}
                              onClick={() =>
                                updateStatus.mutate({
                                  feePlanId: plan.feePlanId,
                                  status: isActive ? "INACTIVE" : "ACTIVE",
                                })
                              }
                            >
                              {isActive ? "Retire" : "Reinstate"}
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

      {creating || editing ? (
        <Dialog
          open
          onClose={closeForm}
          title={editing ? "Edit fee plan" : "New fee plan"}
          className="max-w-lg"
        >
          <FeePlanForm
            plan={editing ?? undefined}
            submitting={activeMutation.isPending}
            error={activeMutation.error}
            onCancel={closeForm}
            onSubmit={submit}
          />
        </Dialog>
      ) : null}
    </>
  );
}
