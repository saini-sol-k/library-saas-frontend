import { apiClient } from "@/lib/api-client";
import type {
  FeePlanRequest,
  FeePlanResponse,
  FeePlanStatus,
  PaymentRequest,
  PaymentResponse,
  StudentFeeRequest,
  StudentFeeResponse,
  StudentFeeStatus,
} from "@/types/api";

/**
 * Fee plans, invoices and payments.
 *
 * Collections are nested under their library exactly as the backend exposes
 * them, so every list is tenant-scoped by the URL. A payment is created under
 * the invoice it settles, which is what lets the backend inherit the student and
 * library rather than trusting a body.
 *
 * There is no delete anywhere: plans are retired by status, invoices and
 * payments are permanent records.
 */
export const feePlansService = {
  listByLibrary: (libraryId: number, status?: FeePlanStatus) =>
    apiClient.get<FeePlanResponse[]>(`libraries/${libraryId}/fee-plans`, { query: { status } }),

  get: (feePlanId: number) => apiClient.get<FeePlanResponse>(`fee-plans/${feePlanId}`),

  create: (libraryId: number, body: FeePlanRequest) =>
    apiClient.post<FeePlanResponse>(`libraries/${libraryId}/fee-plans`, body),

  update: (feePlanId: number, body: FeePlanRequest) =>
    apiClient.put<FeePlanResponse>(`fee-plans/${feePlanId}`, body),

  /** Retire or reinstate. Invoices already raised from the plan are unaffected. */
  updateStatus: (feePlanId: number, status: FeePlanStatus) =>
    apiClient.put<FeePlanResponse>(`fee-plans/${feePlanId}/status`, { status }),
};

export const studentFeesService = {
  listByLibrary: (libraryId: number, status?: StudentFeeStatus) =>
    apiClient.get<StudentFeeResponse[]>(`libraries/${libraryId}/student-fees`, {
      query: { status },
    }),

  listByStudent: (studentId: number) =>
    apiClient.get<StudentFeeResponse[]>(`students/${studentId}/fees`),

  get: (studentFeeId: number) =>
    apiClient.get<StudentFeeResponse>(`student-fees/${studentFeeId}`),

  create: (libraryId: number, body: StudentFeeRequest) =>
    apiClient.post<StudentFeeResponse>(`libraries/${libraryId}/student-fees`, body),
};

export const paymentsService = {
  listByLibrary: (libraryId: number) =>
    apiClient.get<PaymentResponse[]>(`libraries/${libraryId}/payments`),

  listByStudent: (studentId: number) =>
    apiClient.get<PaymentResponse[]>(`students/${studentId}/payments`),

  listByFee: (studentFeeId: number) =>
    apiClient.get<PaymentResponse[]>(`student-fees/${studentFeeId}/payments`),

  get: (paymentId: number) => apiClient.get<PaymentResponse>(`payments/${paymentId}`),

  /** Recorded against one invoice, which is where the balance is protected. */
  record: (studentFeeId: number, body: PaymentRequest) =>
    apiClient.post<PaymentResponse>(`student-fees/${studentFeeId}/payments`, body),
};
