"use client";

import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { AddressForm } from "@/features/addresses/address-form";
import { useAddresses, useDeleteAddress, useSaveAddress } from "@/hooks/use-addresses";
import { messageFor } from "@/lib/api-error";
import {
  BUSINESS_ADDRESS_TYPES,
  PERSONAL_ADDRESS_TYPES,
  formatAddress,
  type AddressOwner,
  type AddressResponse,
} from "@/types/address";

/**
 * Addresses for one owner - a student, library or organization.
 *
 * The backend nests addresses under their owner because the address table has
 * no tenant column, so this panel is dropped onto the owner's own screen rather
 * than living on a page of its own.
 */
export function AddressPanel({
  owner,
  ownerId,
  title = "Addresses",
  canEdit,
}: {
  owner: AddressOwner;
  ownerId: number;
  title?: string;
  /** Whether the signed-in user may add, edit or remove. The backend re-checks. */
  canEdit: boolean;
}) {
  const addressTypes = owner === "students" ? PERSONAL_ADDRESS_TYPES : BUSINESS_ADDRESS_TYPES;

  const query = useAddresses(owner, ownerId);
  const save = useSaveAddress(owner, ownerId);
  const remove = useDeleteAddress(owner, ownerId);

  const [editing, setEditing] = useState<AddressResponse | "new" | null>(null);
  const [deleting, setDeleting] = useState<AddressResponse | null>(null);

  const addresses = query.data ?? [];
  const takenTypes = addresses.map((address) => address.addressType);

  const closeForm = () => {
    setEditing(null);
    save.reset();
  };

  return (
    <>
      <Card>
        <CardHeader
          action={
            canEdit && addresses.length > 0 ? (
              <Button variant="secondary" size="sm" onClick={() => setEditing("new")}>
                <Plus className="h-4 w-4" aria-hidden />
                Add
              </Button>
            ) : undefined
          }
        >
          <CardTitle>{title}</CardTitle>
        </CardHeader>

        {query.isLoading ? (
          <LoadingState label="Loading addresses…" />
        ) : query.isError ? (
          <ErrorState
            title="Could not load addresses"
            description={messageFor(query.error)}
            onRetry={() => query.refetch()}
          />
        ) : addresses.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No addresses yet"
            description={
              canEdit
                ? "Add an address so it appears on records and correspondence."
                : "No address has been recorded."
            }
            action={
              canEdit ? (
                <Button size="sm" onClick={() => setEditing("new")}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add address
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-linesoft">
            {addresses.map((address) => (
              <li key={address.addressId} className="flex items-start gap-3 px-5 py-4">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink4" aria-hidden />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">
                      {address.addressType.charAt(0) +
                        address.addressType.slice(1).toLowerCase()}
                    </span>
                    {address.isPrimary ? <Badge tone="brand">Primary</Badge> : null}
                  </div>

                  <p className="mt-1 text-sm text-ink2">{formatAddress(address)}</p>

                  {address.phone1 || address.email ? (
                    <p className="mt-1 text-[13px] text-ink3">
                      {[address.phone1, address.email].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>

                {canEdit ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${address.addressType.toLowerCase()} address`}
                      onClick={() => setEditing(address)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${address.addressType.toLowerCase()} address`}
                      onClick={() => setDeleting(address)}
                    >
                      <Trash2 className="h-4 w-4 text-danger-600" aria-hidden />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing ? (
        <Dialog
          open
          onClose={closeForm}
          title={editing === "new" ? "Add address" : "Edit address"}
          description={
            editing === "new"
              ? "Recorded against this record and used for correspondence."
              : undefined
          }
          className="max-w-2xl"
        >
          <AddressForm
            address={editing === "new" ? undefined : editing}
            addressTypes={addressTypes}
            takenTypes={takenTypes}
            submitting={save.isPending}
            error={save.error}
            onCancel={closeForm}
            onSubmit={(body) =>
              save.mutate(
                { addressId: editing === "new" ? undefined : editing.addressId, body },
                { onSuccess: closeForm },
              )
            }
          />
        </Dialog>
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.addressId, { onSettled: () => setDeleting(null) })
        }
        loading={remove.isPending}
        title="Remove this address?"
        description={deleting ? formatAddress(deleting) : ""}
        confirmLabel="Remove address"
      />
    </>
  );
}
