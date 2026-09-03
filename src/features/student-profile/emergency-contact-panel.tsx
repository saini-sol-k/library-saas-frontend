"use client";

import { Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { EmergencyContactForm } from "@/features/student-profile/emergency-contact-form";
import {
  useCreateEmergencyContact,
  useDeleteEmergencyContact,
  useEmergencyContacts,
  useUpdateEmergencyContact,
} from "@/hooks/use-student-profile";
import { messageFor } from "@/lib/api-error";
import { fullName } from "@/lib/utils";
import type { EmergencyContactRequest, EmergencyContactResponse } from "@/types/api";

/** One line of an address, for the table cell. */
function addressLine(contact: EmergencyContactResponse): string {
  if (!contact.address) return "—";
  return [contact.address.addressLine1, contact.address.city, contact.address.postalCode]
    .filter(Boolean)
    .join(", ");
}

/**
 * People to contact about a student.
 *
 * Removing a contact removes the contact only; the backend keeps the address
 * row because addresses are shared with student, organization and library
 * records, so the confirmation says so rather than implying a full erase.
 */
export function EmergencyContactPanel({
  studentId,
  canManage,
}: {
  studentId: number;
  /** STUDENT_UPDATE. The backend re-checks. */
  canManage: boolean;
}) {
  const query = useEmergencyContacts(Number.isFinite(studentId) ? studentId : null);
  const create = useCreateEmergencyContact(studentId);
  const update = useUpdateEmergencyContact();
  const remove = useDeleteEmergencyContact();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<EmergencyContactResponse | null>(null);
  const [removing, setRemoving] = useState<EmergencyContactResponse | null>(null);

  const contacts = query.data ?? [];
  const activeMutation = editing ? update : create;

  const closeForm = () => {
    setAdding(false);
    setEditing(null);
    create.reset();
    update.reset();
  };

  const submit = (body: EmergencyContactRequest) => {
    if (editing) {
      update.mutate({ contactId: editing.emergencyContactId, body }, { onSuccess: closeForm });
    } else {
      create.mutate(body, { onSuccess: closeForm });
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          action={
            canManage && contacts.length > 0 ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  create.reset();
                  setAdding(true);
                }}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add contact
              </Button>
            ) : undefined
          }
        >
          <CardTitle>Emergency Contacts</CardTitle>
        </CardHeader>

        {query.isLoading ? (
          <LoadingState label="Loading contacts…" />
        ) : query.isError ? (
          <ErrorState
            title="Could not load contacts"
            description={messageFor(query.error)}
            onRetry={() => query.refetch()}
          />
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No emergency contacts"
            description="Nobody is recorded as a contact for this student."
            action={
              canManage ? (
                <Button size="sm" onClick={() => setAdding(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add contact
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
                  <Th>Relationship</Th>
                  <Th>Contact</Th>
                  <Th>Address</Th>
                  <Th>Primary</Th>
                  {canManage ? <Th className="text-right">Actions</Th> : null}
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <Tr key={contact.emergencyContactId}>
                    <Td className="font-medium text-ink">
                      {fullName(contact.firstName, contact.lastName)}
                    </Td>
                    <Td>{contact.relationship ?? "—"}</Td>
                    <Td>
                      <div>{contact.mobile ?? "—"}</div>
                      {contact.email ? (
                        <div className="text-[12px] text-ink3">{contact.email}</div>
                      ) : null}
                    </Td>
                    <Td className="text-[13px] text-ink2">{addressLine(contact)}</Td>
                    <Td>
                      {contact.isPrimary ? (
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              update.reset();
                              setEditing(contact);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${contact.firstName}`}
                            onClick={() => setRemoving(contact)}
                          >
                            <Trash2 className="h-4 w-4 text-danger-600" aria-hidden />
                          </Button>
                        </div>
                      </Td>
                    ) : null}
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>

      {adding || editing ? (
        <Dialog
          open
          onClose={closeForm}
          title={editing ? "Edit emergency contact" : "Add an emergency contact"}
          className="max-w-lg"
        >
          <EmergencyContactForm
            contact={editing ?? undefined}
            submitting={activeMutation.isPending}
            error={activeMutation.error}
            onCancel={closeForm}
            onSubmit={submit}
          />
        </Dialog>
      ) : null}

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.emergencyContactId, { onSettled: () => setRemoving(null) })
        }
        loading={remove.isPending}
        title={removing ? `Remove ${removing.firstName}?` : ""}
        description="They will no longer be listed as a contact for this student."
        confirmLabel="Remove contact"
        note="The address on file is kept, because it may be shared with other records."
      />
    </>
  );
}
