"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { messageFor } from "@/lib/api-error";
import { feePlansService, paymentsService, studentFeesService } from "@/services/finance";
import type {
  FeePlanRequest,
  FeePlanStatus,
  PaymentRequest,
  StudentFeeRequest,
  StudentFeeStatus,
} from "@/types/api";

const PLANS = "fee-plans";
const FEES = "student-fees";
const PAYMENTS = "payments";

/* ------------------------------------------------------------- fee plans */

export function useFeePlans(libraryId: number | null, status?: FeePlanStatus) {
  return useQuery({
    queryKey: [PLANS, libraryId, status ?? "ALL"],
    queryFn: () => feePlansService.listByLibrary(libraryId as number, status),
    enabled: libraryId !== null && Number.isFinite(libraryId),
  });
}

export function useCreateFeePlan(libraryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: FeePlanRequest) => feePlansService.create(libraryId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLANS] });
      toast.success("Fee plan created");
    },
  });
}

export function useUpdateFeePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ feePlanId, body }: { feePlanId: number; body: FeePlanRequest }) =>
      feePlansService.update(feePlanId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLANS] });
      toast.success("Fee plan updated");
    },
  });
}

export function useUpdateFeePlanStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ feePlanId, status }: { feePlanId: number; status: FeePlanStatus }) =>
      feePlansService.updateStatus(feePlanId, status),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: [PLANS] });
      toast.success(plan.status === "ACTIVE" ? "Fee plan reinstated" : "Fee plan retired");
    },
    onError: (error) => toast.error(messageFor(error)),
  });
}

/* ---------------------------------------------------------- student fees */

export function useLibraryFees(libraryId: number | null, status?: StudentFeeStatus) {
  return useQuery({
    queryKey: [FEES, "library", libraryId, status ?? "ALL"],
    queryFn: () => studentFeesService.listByLibrary(libraryId as number, status),
    enabled: libraryId !== null && Number.isFinite(libraryId),
  });
}

export function useStudentFees(studentId: number | null) {
  return useQuery({
    queryKey: [FEES, "student", studentId],
    queryFn: () => studentFeesService.listByStudent(studentId as number),
    enabled: studentId !== null && Number.isFinite(studentId),
  });
}

export function useCreateStudentFee(libraryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: StudentFeeRequest) => studentFeesService.create(libraryId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FEES] });
      toast.success("Invoice raised");
    },
  });
}

/* --------------------------------------------------------------- payments */

export function useLibraryPayments(libraryId: number | null) {
  return useQuery({
    queryKey: [PAYMENTS, "library", libraryId],
    queryFn: () => paymentsService.listByLibrary(libraryId as number),
    enabled: libraryId !== null && Number.isFinite(libraryId),
  });
}

export function useStudentPayments(studentId: number | null) {
  return useQuery({
    queryKey: [PAYMENTS, "student", studentId],
    queryFn: () => paymentsService.listByStudent(studentId as number),
    enabled: studentId !== null && Number.isFinite(studentId),
  });
}

export function useFeePayments(studentFeeId: number | null) {
  return useQuery({
    queryKey: [PAYMENTS, "fee", studentFeeId],
    queryFn: () => paymentsService.listByFee(studentFeeId as number),
    enabled: studentFeeId !== null && Number.isFinite(studentFeeId),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentFeeId, body }: { studentFeeId: number; body: PaymentRequest }) =>
      paymentsService.record(studentFeeId, body),
    onSuccess: () => {
      // A payment changes the invoice balance and status too, so both go stale.
      queryClient.invalidateQueries({ queryKey: [PAYMENTS] });
      queryClient.invalidateQueries({ queryKey: [FEES] });
      toast.success("Payment recorded");
    },
    // Balance and duplicate-receipt errors are shown on the form, next to the
    // field at fault, rather than as a toast the user cannot act on.
  });
}
