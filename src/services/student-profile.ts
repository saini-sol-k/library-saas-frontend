import { apiClient } from "@/lib/api-client";
import type {
  EmergencyContactRequest,
  EmergencyContactResponse,
  StudentDocumentRequest,
  StudentDocumentResponse,
} from "@/types/api";

/**
 * A student's documents and emergency contacts.
 *
 * Collections nest under the student, exactly as the backend exposes them, so
 * every read is scoped by the URL. Single resources sit at the top level.
 *
 * Documents have no delete: the schema offers only an ACTIVE status, so there is
 * no archive state and no safe basis for removal.
 */
export const studentDocumentsService = {
  listByStudent: (studentId: number) =>
    apiClient.get<StudentDocumentResponse[]>(`students/${studentId}/documents`),

  get: (documentId: number) =>
    apiClient.get<StudentDocumentResponse>(`student-documents/${documentId}`),

  create: (studentId: number, body: StudentDocumentRequest) =>
    apiClient.post<StudentDocumentResponse>(`students/${studentId}/documents`, body),

  update: (documentId: number, body: StudentDocumentRequest) =>
    apiClient.put<StudentDocumentResponse>(`student-documents/${documentId}`, body),
};

export const emergencyContactsService = {
  listByStudent: (studentId: number) =>
    apiClient.get<EmergencyContactResponse[]>(`students/${studentId}/emergency-contacts`),

  get: (contactId: number) =>
    apiClient.get<EmergencyContactResponse>(`student-emergency-contacts/${contactId}`),

  create: (studentId: number, body: EmergencyContactRequest) =>
    apiClient.post<EmergencyContactResponse>(`students/${studentId}/emergency-contacts`, body),

  update: (contactId: number, body: EmergencyContactRequest) =>
    apiClient.put<EmergencyContactResponse>(`student-emergency-contacts/${contactId}`, body),

  /** Removes the contact only; the backend keeps the address row. */
  remove: (contactId: number) =>
    apiClient.delete<null>(`student-emergency-contacts/${contactId}`),
};
