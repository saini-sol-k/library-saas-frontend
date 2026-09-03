"use client";

import { ChevronLeft, ChevronRight, Plus, Search, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useStudentList } from "@/hooks/use-students";
import { PageHeader } from "@/layouts/app-shell";
import { messageFor } from "@/lib/api-error";
import { STUDENT_STATUSES } from "@/schemas/student";
import { fullName } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";

const PAGE_SIZE = 20;

function StudentsTable() {
  const router = useRouter();
  const params = useSearchParams();
  const { can } = useSession();

  const [search, setSearch] = useState(params.get("search") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [page, setPage] = useState(Number(params.get("page") ?? 0));

  // Debounce so typing does not fire a request per keystroke. Resetting to the
  // first page happens in the same callback, rather than in a second effect
  // that would trigger a cascading render.
  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useStudentList({
    search: debounced || undefined,
    status: status || undefined,
    page,
    size: PAGE_SIZE,
  });

  const data = query.data;
  const rows = data?.content ?? [];
  const total = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const hasFilters = Boolean(debounced || status);

  return (
    <>
      <PageHeader
        title="Students"
        description={
          query.isLoading ? "Loading…" : `${total} student${total === 1 ? "" : "s"} in this library`
        }
        actions={
          can("STUDENT_CREATE") ? (
            <Link href="/students/new">
              <Button>
                <Plus className="h-4 w-4" aria-hidden />
                Add Student
              </Button>
            </Link>
          ) : null
        }
      />

      <Card>
        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-linesoft p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink4" aria-hidden />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or mobile…"
              aria-label="Search students"
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
            aria-label="Filter by status"
            className="sm:w-44"
          >
            <option value="">All statuses</option>
            {STUDENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatus("");
                setPage(0);
              }}
            >
              <X className="h-4 w-4" aria-hidden />
              Clear
            </Button>
          ) : null}
        </div>

        {query.isLoading ? (
          <LoadingState label="Loading students…" />
        ) : query.isError ? (
          <ErrorState description={messageFor(query.error)} onRetry={() => query.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasFilters ? "No students match those filters" : "No students yet"}
            description={
              hasFilters
                ? "Try a different name, mobile number or status."
                : "Add your first student to get started."
            }
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatus("");
                  }}
                >
                  Clear filters
                </Button>
              ) : can("STUDENT_CREATE") ? (
                <Link href="/students/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4" aria-hidden />
                    Add Student
                  </Button>
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Code</Th>
                    <Th>Name</Th>
                    <Th>Mobile</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((student) => (
                    <Tr
                      key={student.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/students/${student.id}`)}
                    >
                      <Td className="font-mono text-[13px] text-ink">{student.studentCode}</Td>
                      <Td className="font-medium text-ink">
                        {fullName(student.firstName, student.lastName)}
                      </Td>
                      <Td>{student.mobile || "—"}</Td>
                      <Td>
                        <StatusBadge status={student.status} />
                      </Td>
                      <Td className="text-right">
                        <Link
                          href={`/students/${student.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="text-[13px] font-medium text-brand-600 hover:text-brand-700"
                        >
                          View
                        </Link>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>

            {/* Pagination - Spring Page metadata drives this directly */}
            <div className="flex flex-col gap-3 border-t border-linesoft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-ink3">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={data?.first ?? page === 0}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Previous
                </Button>
                <span className="text-[13px] text-ink3">
                  Page {page + 1} of {Math.max(totalPages, 1)}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={data?.last ?? true}
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <StudentsTable />
    </Suspense>
  );
}
