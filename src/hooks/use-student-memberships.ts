"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { messageFor } from "@/lib/api-error";
import { studentMembershipsService } from "@/services/student-memberships";
import type {
  StudentMembershipRequest,
  StudentMembershipStatus,
  StudentMembershipUpdateRequest,
} from "@/types/api";

const KEY = "student-memberships";

export function useLibraryStudentMemberships(
  libraryId: number | null,
  status?: StudentMembershipStatus,
) {
  return useQuery({
    queryKey: [KEY, "library", libraryId, status ?? "ALL"],
    queryFn: () => studentMembershipsService.listByLibrary(libraryId as number, status),
    enabled: libraryId !== null && Number.isFinite(libraryId),
  });
}

export function useStudentMembershipHistory(studentId: number | null) {
  return useQuery({
    queryKey: [KEY, "student", studentId],
    queryFn: () => studentMembershipsService.listByStudent(studentId as number),
    enabled: studentId !== null && Number.isFinite(studentId),
  });
}

export function useCreateStudentMembership(libraryId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: StudentMembershipRequest) =>
      studentMembershipsService.create(libraryId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success("Membership created");
    },
    // Conflicts and not-found are shown on the form, next to the field at fault.
  });
}

export function useUpdateStudentMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      membershipId,
      body,
    }: {
      membershipId: number;
      body: StudentMembershipUpdateRequest;
    }) => studentMembershipsService.update(membershipId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success("Membership updated");
    },
  });
}

export function useRenewStudentMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      membershipId,
      body,
    }: {
      membershipId: number;
      body: StudentMembershipUpdateRequest;
    }) => studentMembershipsService.renew(membershipId, body),
    onSuccess: () => {
      // Renewing also closes the previous period, so the whole list is stale.
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success("Membership renewed");
    },
  });
}

export function useUpdateStudentMembershipStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      membershipId,
      status,
    }: {
      membershipId: number;
      status: StudentMembershipStatus;
    }) => studentMembershipsService.updateStatus(membershipId, status),
    onSuccess: (membership) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success(
        membership.status === "ACTIVE" ? "Membership activated" : "Membership " + membership.status.toLowerCase(),
      );
    },
    onError: (error) => toast.error(messageFor(error)),
  });
}
