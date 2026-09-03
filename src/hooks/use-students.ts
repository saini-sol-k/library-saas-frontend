"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { messageFor } from "@/lib/api-error";
import { studentsService } from "@/services/students";
import type {
  StudentCreateRequest,
  StudentListParams,
  StudentUpdateRequest,
} from "@/types/api";

const KEY = "students";

export function useStudentList(params: StudentListParams) {
  return useQuery({
    queryKey: [KEY, "list", params],
    queryFn: () => studentsService.list(params),
    placeholderData: (previous) => previous, // keeps the table steady while paging
  });
}

export function useStudent(id: number | null) {
  return useQuery({
    queryKey: [KEY, "detail", id],
    queryFn: () => studentsService.get(id as number),
    enabled: id !== null && Number.isFinite(id),
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (body: StudentCreateRequest) => studentsService.create(body),
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success(`${student.firstName} added`);
      router.push(`/students/${student.id}`);
    },
    // Errors are rendered on the form so the user sees them next to the field
    // that caused them; the toast is only a fallback for non-field errors.
  });
}

export function useUpdateStudent(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: StudentUpdateRequest) => studentsService.update(id, body),
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success(`${student.firstName} updated`);
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (id: number) => studentsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success("Student deleted");
      router.push("/students");
    },
    onError: (error) => toast.error(messageFor(error)),
  });
}
