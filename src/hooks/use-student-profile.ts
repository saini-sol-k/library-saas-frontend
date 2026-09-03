"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { messageFor } from "@/lib/api-error";
import { emergencyContactsService, studentDocumentsService } from "@/services/student-profile";
import type { EmergencyContactRequest, StudentDocumentRequest } from "@/types/api";

const DOCUMENTS = "student-documents";
const CONTACTS = "student-emergency-contacts";

/* ------------------------------------------------------------- documents */

export function useStudentDocuments(studentId: number | null) {
  return useQuery({
    queryKey: [DOCUMENTS, studentId],
    queryFn: () => studentDocumentsService.listByStudent(studentId as number),
    enabled: studentId !== null && Number.isFinite(studentId),
  });
}

export function useCreateStudentDocument(studentId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: StudentDocumentRequest) =>
      studentDocumentsService.create(studentId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS] });
      toast.success("Document recorded");
    },
  });
}

export function useUpdateStudentDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, body }: { documentId: number; body: StudentDocumentRequest }) =>
      studentDocumentsService.update(documentId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS] });
      toast.success("Document updated");
    },
  });
}

/* ----------------------------------------------------- emergency contacts */

export function useEmergencyContacts(studentId: number | null) {
  return useQuery({
    queryKey: [CONTACTS, studentId],
    queryFn: () => emergencyContactsService.listByStudent(studentId as number),
    enabled: studentId !== null && Number.isFinite(studentId),
  });
}

export function useCreateEmergencyContact(studentId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: EmergencyContactRequest) =>
      emergencyContactsService.create(studentId, body),
    onSuccess: () => {
      // Promoting a contact demotes another, so the whole list goes stale.
      queryClient.invalidateQueries({ queryKey: [CONTACTS] });
      toast.success("Emergency contact added");
    },
  });
}

export function useUpdateEmergencyContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, body }: { contactId: number; body: EmergencyContactRequest }) =>
      emergencyContactsService.update(contactId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS] });
      toast.success("Emergency contact updated");
    },
  });
}

export function useDeleteEmergencyContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: number) => emergencyContactsService.remove(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS] });
      toast.success("Emergency contact removed");
    },
    onError: (error) => toast.error(messageFor(error)),
  });
}
