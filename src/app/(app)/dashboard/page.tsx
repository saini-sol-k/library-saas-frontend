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
import { CollectionBreakdownCard } from "@/features/reporting/collection-breakdown-card";
import { ExpiringMembershipsCard } from "@/features/reporting/expiring-memberships-card";
import { TodaysSummaryCard } from "@/features/reporting/todays-summary-card";
import { useDashboardSummary } from "@/hooks/use-reporting";
import { messageFor } from "@/lib/api-error";
import { formatDateTime, formatMoney, greeting } from "@/lib/utils";
import { useSeats } from "@/hooks/use-seats";
import { summariseSeats } from "@/types/seat";
import { useSession } from "@/providers/session-provider";
import { studentsService } from "@/services/students";

/**
 * Dashboard.
 *
 * With REPORT_VIEW the tiles come from a single library-scoped summary endpoint
 * that counts and sums in the database, rather than downloading student and seat
 * lists to count them in the browser.
 *
 * Without REPORT_VIEW the page falls back to the student and seat endpoints the
 * role can already reach, so a receptionist keeps the tiles they had rather than
 * losing the dashboard to a permission they were never granted.
 *
 * Dates shown for reporting come from the backend, which derives them from the
 * library's own timezone. The page never recomputes "today" from the browser.
 */
export default function DashboardPage() {
  const { username, activeLibrary, activeOrganization, can } = useSession();

  const libraryId = activeLibrary?.libraryId ?? null;
  const canReport = can("REPORT_VIEW");

  const summaryQuery = useDashboardSummary(libraryId, canReport);
  const summary = summaryQuery.data;

  // Fallbacks, used only when reporting is not available to this role. They stay
  // idle otherwise so the dashboard makes one request instead of three.
  const studentsQuery = useQuery({
    queryKey: ["students", "count"],
    queryFn: () => studentsService.list({ page: 0, size: 1 }),
    enabled: !canReport,
  });
  const seatsQuery = useSeats(
    !canReport && can("SEAT_VIEW") ? libraryId : null,
  );
  const fallbackSeats = summariseSeats(seatsQuery.data ?? []);

  const metricsLoading = canReport ? summaryQuery.isLoading : studentsQuery.isLoading;
  const totalStudents = canReport ? summary?.totalStudents : studentsQuery.data?.totalElements;

  // Seat figures come from whichever source is in play.
  const seats = canReport
    ? {
        total: summary?.totalSeats ?? 0,
        available: summary?.availableSeats ?? 0,
        occupied: summary?.occupiedSeats ?? 0,
        maintenance: summary?.seatsByStatus?.MAINTENANCE ?? 0,
        inactive: summary?.seatsByStatus?.INACTIVE ?? 0,
      }
    : fallbackSeats;
  const seatsReady = canReport ? Boolean(summary) : Boolean(seatsQuery.data);
  const seatsLoading = canReport ? summaryQuery.isLoading : seatsQuery.isLoading;
  const seatsError = canReport ? summaryQuery.error : seatsQuery.error;
  const seatsFailed = canReport ? summaryQuery.isError : seatsQuery.isError;

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
          delta={totalStudents === undefined ? "" : "In this library"}
          tone="brand"
          icon={Users}
          loading={metricsLoading}
        />
        <StatCard
          label="Active Memberships"
          value={summary?.activeMemberships ?? 0}
          delta={summary ? "Currently active" : ""}
          tone="success"
          icon={UserCheck}
          loading={summaryQuery.isLoading}
          unavailable={!canReport}
        />
        <StatCard
          label="Occupied Seats"
          value={seatsReady ? seats.occupied : 0}
          delta={seatsReady ? `of ${seats.total} seats` : ""}
          tone="danger"
          icon={Sofa}
          loading={seatsLoading}
          unavailable={!seatsReady && !seatsLoading}
        />
        <StatCard
          label="Available Seats"
          value={seatsReady ? seats.available : 0}
          delta={seatsReady ? "Ready to allocate" : ""}
          tone="success"
          icon={Sofa}
          loading={seatsLoading}
          unavailable={!seatsReady && !seatsLoading}
        />
        <StatCard
          label="Students Inside"
          value={summary?.studentsCurrentlyInside ?? 0}
          delta={summary ? `${summary.attendanceToday} visits today` : ""}
          tone="accent"
          icon={LogIn}
          loading={summaryQuery.isLoading}
          unavailable={!canReport}
        />
        <StatCard
          label="Today's Collection"
          value={summary ? formatMoney(summary.collectionToday) : "—"}
          delta={summary ? `${summary.paymentsToday} received` : ""}
          tone="warn"
          icon={IndianRupee}
          loading={summaryQuery.isLoading}
          unavailable={!canReport}
        />
      </div>

      {canReport && summaryQuery.isError ? (
        <Card>
          <ErrorState
            title="Could not load dashboard metrics"
            description={messageFor(summaryQuery.error)}
            onRetry={() => summaryQuery.refetch()}
          />
        </Card>
      ) : null}

      {!canReport && studentsQuery.isError ? (
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
                <Link href="/seats">
                  <Button variant="secondary" size="sm">
                    View All Seats
                  </Button>
                </Link>
              }
            >
              <CardTitle>Seat Status (Real Time)</CardTitle>
            </CardHeader>
            <div className="p-5">
              {seatsFailed ? (
                <ErrorState
                  title="Could not load seats"
                  description={messageFor(seatsError)}
                  onRetry={() => (canReport ? summaryQuery.refetch() : seatsQuery.refetch())}
                />
              ) : seatsReady && seats.total === 0 ? (
                <EmptyState
                  icon={Sofa}
                  title="No seats recorded"
                  description="Add seats to this library to track occupancy here."
                />
              ) : (
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Available", value: seats.available },
                    { label: "Occupied", value: seats.occupied },
                    { label: "Maintenance", value: seats.maintenance },
                    { label: "Out of service", value: seats.inactive },
                  ].map((tile) => (
                    <div key={tile.label} className="rounded-lg border border-line px-4 py-3">
                      <dt className="text-[13px] text-ink3">{tile.label}</dt>
                      <dd className="text-xl font-semibold tabular-nums text-ink">
                        {seatsLoading ? "—" : tile.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </Card>
        </div>

        {canReport ? (
          <TodaysSummaryCard
            summary={summary}
            isLoading={summaryQuery.isLoading}
            error={summaryQuery.isError ? summaryQuery.error : null}
            onRetry={() => summaryQuery.refetch()}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Summary</CardTitle>
            </CardHeader>
            <div className="p-5">
              <EmptyState
                icon={CalendarDays}
                title="Not available to your role"
                description="Viewing reports needs the report permission."
              />
            </div>
          </Card>
        )}
      </div>

      {/* Three activity lists */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Recent Check-ins</CardTitle>
          </CardHeader>
          <div className="p-5">
            {/*
              Deliberately still a gap. Reporting returns today's visit counts but
              no feed of individual check-ins, and showing one would mean
              inventing data the API does not provide.
            */}
            <ApiGapNotice gap="recentActivityFeeds" />
          </div>
        </Card>

        <ExpiringMembershipsCard libraryId={libraryId} canView={canReport} />

        <CollectionBreakdownCard libraryId={libraryId} canView={canReport} />
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
