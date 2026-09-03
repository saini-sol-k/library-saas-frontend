"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { messageFor } from "@/lib/api-error";
import { membershipsService } from "@/services/memberships";
import type { MembershipRequest, MembershipScope, MembershipStatus } from "@/types/api";

const KEY = "memberships";

export function useMembers(scope: MembershipScope, tenantId: number | null) {
  return useQuery({
    queryKey: [KEY, scope, tenantId],
    queryFn: () => membershipsService.list(scope, tenantId as number),
    enabled: tenantId !== null && Number.isFinite(tenantId),
  });
}

export function useAddMember(scope: MembershipScope, tenantId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: MembershipRequest) => membershipsService.add(scope, tenantId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success("Member added");
    },
    // Conflicts and not-found are shown on the form, next to the field at fault.
  });
}

export function useUpdateMemberStatus(scope: MembershipScope, tenantId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: MembershipStatus }) =>
      membershipsService.updateStatus(scope, tenantId, userId, status),
    onSuccess: (membership) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success(
        membership.status === "ACTIVE" ? "Membership activated" : "Membership deactivated",
      );
    },
    onError: (error) => toast.error(messageFor(error)),
  });
}

/**
 * Promotes a membership to primary. The backend refuses this for anyone but the
 * signed-in user, so the panel only offers it on the caller's own row.
 */
export function useSetPrimaryMember(scope: MembershipScope, tenantId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => membershipsService.setPrimary(scope, tenantId, userId),
    onSuccess: () => {
      // A promotion demotes the user's previous primary in the other tenant too.
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success(
        scope === "organizations" ? "Primary organization updated" : "Primary library updated",
      );
    },
    onError: (error) => toast.error(messageFor(error)),
  });
}

export function useRemoveMember(scope: MembershipScope, tenantId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => membershipsService.remove(scope, tenantId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success("Member removed");
    },
    onError: (error) => toast.error(messageFor(error)),
  });
}
