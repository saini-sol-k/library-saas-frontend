"use client";

import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { DocumentForm } from "@/features/student-profile/document-form";
import {
  useCreateStudentDocument,
  useStudentDocuments,
  useUpdateStudentDocument,
} from "@/hooks/use-student-profile";
import { messageFor } from "@/lib/api-error";
import type { StudentDocumentRequest, StudentDocumentResponse } from "@/types/api";

/**
 * Documents held on a student's file.
 *
 * There is no remove control, because the API offers no delete: the schema has
 * only an ACTIVE status and no archive state, so nothing here could honestly
 * represent taking a document off the file.
 */
export function DocumentPanel({
  studentId,
  canManage,
}: {
  studentId: number;
  /** STUDENT_UPDATE. The backend re-checks. */
  canManage: boolean;
}) {
  const query = useStudentDocuments(Number.isFinite(studentId) ? studentId : null);
  const create = useCreateStudentDocument(studentId);
  const update = useUpdateStudentDocument();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StudentDocumentResponse | null>(null);

  const documents = query.data ?? [];
  const activeMutation = editing ? update : create;

  const closeForm = () => {
    setAdding(false);
    setEditing(null);
    create.reset();
    update.reset();
  };

  const submit = (body: StudentDocumentRequest) => {
    if (editing) {
      update.mutate({ documentId: editing.documentId, body }, { onSuccess: closeForm });
    } else {
      create.mutate(body, { onSuccess: closeForm });
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          action={
            canManage && documents.length > 0 ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  create.reset();
                  setAdding(true);
                }}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add document
              </Button>
            ) : undefined
          }
        >
          <CardTitle>Documents</CardTitle>
        </CardHeader>

        {query.isLoading ? (
          <LoadingState label="Loading documents…" />
        ) : query.isError ? (
          <ErrorState
            title="Could not load documents"
            description={messageFor(query.error)}
            onRetry={() => query.refetch()}
          />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents"
            description="Nothing has been filed for this student."
            action={
              canManage ? (
                <Button size="sm" onClick={() => setAdding(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add document
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Type</Th>
                  <Th>Number</Th>
                  <Th>Reference</Th>
                  <Th>Status</Th>
                  {canManage ? <Th className="text-right">Actions</Th> : null}
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <Tr key={document.documentId}>
                    <Td className="font-medium text-ink">{document.documentType}</Td>
                    <Td className="font-mono text-[13px]">{document.documentNumber ?? "—"}</Td>
                    <Td className="font-mono text-[12px] text-ink3">
                      {document.documentUrl ?? "—"}
                    </Td>
                    <Td>
                      <StatusBadge status={document.status} />
                    </Td>
                    {canManage ? (
                      <Td className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            update.reset();
                            setEditing(document);
                          }}
                        >
                          Edit
                        </Button>
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
          title={editing ? "Edit document" : "Record a document"}
          className="max-w-lg"
        >
          <DocumentForm
            document={editing ?? undefined}
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
