"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  IndianRupee,
  LogIn,
  Sofa,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiGapNotice, EmptyState, ErrorState } from "@/components/ui/states";
import { StatCard } from "@/features/dashboard/stat-card";
import { messageFor } from "@/lib/api-error";
import { formatDateTime, greeting } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";
import { studentsService } from "@/services/students";

/**
 * Dashboard.
 *
 * Only "Total Students" has a backing API today - it comes from the paged
 * student endpoint's totalElements. Every other tile is rendered in its real
 * position but explicitly marked unavailable, and the sections that need seats,
 * attendance, memberships or payments show the specific missing endpoint.
 */
export default function DashboardPage() {
  const { username, activeLibrary, activeOrganization } = useSession();

  const studentsQuery = useQuery({
    queryKey: ["students", "count"],
    queryFn: () => studentsService.list({ page: 0, size: 1 }),
  });

  const totalStudents = studentsQuery.data?.totalElements;

  return (
    <div className="space-y-5">
      {/* Welcome strip */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-ink">
              {greeting()}, {username} <span aria-hidden>👋</span>
            </h2>
            <p className="mt-1 text-sm text-ink2">Welcome back to A.K. Library</p>
            <p className="mt-0.5 text-[13px] text-ink3">
              {activeLibrary?.name ?? "No library assigned"}
              {activeOrganization ? ` · ${activeOrganization.name}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-line bg-page px-4 py-3">
            <CalendarDays className="h-5 w-5 text-brand-600" aria-hidden />
            <div>
              <p className="text-[13px] font-medium text-ink">{formatDateTime(new Date().toISOString())}</p>
              <p className="text-[12px] text-ink3">Local time</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Metric row - matches the six tiles in the reference */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 wide:grid-cols-6">
        <StatCard
          label="Total Students"
          value={totalStudents ?? 0}
          delta={totalStudents === undefined ? "" : "Across your library"}
          tone="brand"
          icon={Users}
          loading={studentsQuery.isLoading}
        />
        <StatCard label="Active Memberships" tone="success" icon={UserCheck} unavailable />
        <StatCard label="Occupied Seats" tone="danger" icon={Sofa} unavailable />
        <StatCard label="Available Seats" tone="success" icon={Sofa} unavailable />
        <StatCard label="Students Inside" tone="accent" icon={LogIn} unavailable />
        <StatCard label="Today's Collection" tone="warn" icon={IndianRupee} unavailable />
      </div>

      {studentsQuery.isError ? (
        <Card>
          <ErrorState
            title="Could not load the student count"
            description={messageFor(studentsQuery.error)}
            onRetry={() => studentsQuery.refetch()}
          />
        </Card>
      ) : null}

      {/* Seat status + today's summary */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader
              action={
                <Button variant="secondary" size="sm" disabled>
                  View All Seats
                </Button>
              }
            >
              <CardTitle>Seat Status (Real Time)</CardTitle>
            </CardHeader>
            <div className="p-5">
              <ApiGapNotice gap="seats" />
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Summary</CardTitle>
          </CardHeader>
          <div className="p-5">
            <ApiGapNotice gap="dashboardMetrics" />
          </div>
        </Card>
      </div>

      {/* Three activity lists */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Recent Check-ins</CardTitle>
          </CardHeader>
          <div className="p-5">
            <ApiGapNotice gap="attendance" />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expiring Memberships</CardTitle>
          </CardHeader>
          <div className="p-5">
            <ApiGapNotice gap="studentMemberships" />
            <p className="mt-3 text-[13px] text-ink3">
              Requirement captured: show memberships expiring within 15 days once the endpoint
              exists.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <div className="p-5">
            <ApiGapNotice gap="payments" />
          </div>
        </Card>
      </div>

      {/* Students is the one fully wired area, so surface it */}
      <Card>
        <CardHeader
          action={
            <Link href="/students">
              <Button variant="secondary" size="sm">
                Open Students
              </Button>
            </Link>
          }
        >
          <CardTitle>Available Today</CardTitle>
        </CardHeader>
        <div className="p-5">
          <EmptyState
            title="Student management is fully connected"
            description="Listing, search, pagination, creation, editing and deletion all run against the live backend. The remaining modules appear here as their APIs are built."
            icon={Users}
            action={
              <Link href="/students">
                <Button size="sm">Go to Students</Button>
              </Link>
            }
          />
        </div>
      </Card>
    </div>
  );
}
