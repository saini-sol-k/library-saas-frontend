import { apiClient } from "@/lib/api-client";
import type {
  Page,
  StudentCreateRequest,
  StudentListParams,
  StudentResponse,
  StudentSummaryResponse,
  StudentUpdateRequest,
} from "@/types/api";

/**
 * Student API calls. Kept out of components so screens deal in data, not HTTP.
 * Endpoints map 1:1 onto StudentController.
 */
export const studentsService = {
  list: (params: StudentListParams = {}) =>
    apiClient.get<Page<StudentSummaryResponse>>("students", {
      query: {
        search: params.search,
        status: params.status,
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    }),

  get: (id: number) => apiClient.get<StudentResponse>(`students/${id}`),

  create: (body: StudentCreateRequest) => apiClient.post<StudentResponse>("students", body),

  update: (id: number, body: StudentUpdateRequest) =>
    apiClient.put<StudentResponse>(`students/${id}`, body),

  remove: (id: number) => apiClient.delete<null>(`students/${id}`),
};
