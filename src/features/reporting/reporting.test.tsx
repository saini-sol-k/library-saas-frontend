import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CollectionBreakdownCard } from "@/features/reporting/collection-breakdown-card";
import { CollectionReportPanel } from "@/features/reporting/collection-report-panel";
import { ExpiringMembershipsCard } from "@/features/reporting/expiring-memberships-card";
import { ExpiringMembershipsPanel } from "@/features/reporting/expiring-memberships-panel";
import { OutstandingSummaryPanel } from "@/features/reporting/outstanding-summary-panel";
import { TodaysSummaryCard } from "@/features/reporting/todays-summary-card";
import type {
  CollectionReportResponse,
  DashboardSummaryResponse,
  ExpiringMembershipResponse,
  OutstandingSummaryResponse,
} from "@/types/api";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

/** Mirrors the shape the Phase 2H backend returns, money included as strings. */
const SUMMARY: DashboardSummaryResponse = {
  libraryId: 1,
  libraryName: "Bright Future Saharanpur",
  timezone: "Asia/Kolkata",
  reportingDate: "2026-09-04",
  totalStudents: 3,
  studentsByStatus: { ACTIVE: 3 },
  totalSeats: 5,
  occupiedSeats: 2,
  availableSeats: 2,
  seatsByStatus: { AVAILABLE: 2, MAINTENANCE: 1, OCCUPIED: 2 },
  activeMemberships: 3,
  attendanceToday: 2,
  studentsCurrentlyInside: 1,
  collectionToday: "1234.56",
  paymentsToday: 2,
};

const COLLECTION: CollectionReportResponse = {
  libraryId: 1,
  timezone: "Asia/Kolkata",
  fromDate: "2026-08-06",
  toDate: "2026-09-04",
  totalCollected: "2200.00",
  paymentCount: 2,
  byDay: [
    { date: "2026-08-30", paymentCount: 1, amount: "1500.00" },
    { date: "2026-09-02", paymentCount: 1, amount: "700.00" },
  ],
  byMethod: [
    { paymentMethod: "CASH", paymentCount: 1, amount: "700.00" },
    { paymentMethod: "UPI", paymentCount: 1, amount: "1500.00" },
  ],
};

const OUTSTANDING: OutstandingSummaryResponse = {
  libraryId: 1,
  timezone: "Asia/Kolkata",
  asOfDate: "2026-09-04",
  invoiceCount: 3,
  totalInvoiced: "4400.00",
  totalSettled: "2200.00",
  totalOutstanding: "2200.00",
  overdueInvoiceCount: 1,
  overdueAmount: "1500.00",
};

function membership(
  overrides: Partial<ExpiringMembershipResponse> = {},
): ExpiringMembershipResponse {
  return {
    membershipId: 1,
    studentId: 1,
    studentCode: "STU001",
    studentName: "Rahul Sharma",
    membershipNumber: "MEM001",
    startDate: "2026-01-10",
    endDate: "2026-09-10",
    status: "ACTIVE",
    autoRenew: true,
    daysRemaining: 6,
    ...overrides,
  };
}

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}
const ok = (data: unknown) => reply(200, { success: true, message: "ok", data });

function routeFetch(overrides: Record<string, () => Response> = {}) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const path = (url as string).split("?")[0];
    const key = `${init?.method ?? "GET"} ${path}`;
    if (overrides[key]) return overrides[key]();
    if (key === "GET /api/backend/libraries/1/dashboard") return ok(SUMMARY);
    if (key === "GET /api/backend/libraries/1/reports/collection") return ok(COLLECTION);
    if (key === "GET /api/backend/libraries/1/reports/outstanding") return ok(OUTSTANDING);
    if (key === "GET /api/backend/libraries/1/reports/expiring-memberships") {
      return ok([membership()]);
    }
    return ok(null);
  });
}

function renderWith(node: React.ReactElement, fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchMock);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("TodaysSummaryCard", () => {
  it("renders the day's figures and the library's own reporting date", () => {
    render(
      <TodaysSummaryCard summary={SUMMARY} isLoading={false} error={null} onRetry={() => {}} />,
    );

    // Visits and receipts are both 2 in this fixture, so each figure is read
    // from its own row rather than by searching the card for the text "2".
    const visits = screen.getByText("Visits today").closest("div") as HTMLElement;
    expect(within(visits).getByText("2")).toBeInTheDocument();

    const inside = screen.getByText("Currently inside").closest("div") as HTMLElement;
    expect(within(inside).getByText("1")).toBeInTheDocument();

    const receipts = screen.getByText("Receipts today").closest("div") as HTMLElement;
    expect(within(receipts).getByText("2")).toBeInTheDocument();

    // The backend's reporting date and timezone are displayed, not recomputed.
    expect(screen.getByText(/Asia\/Kolkata/)).toBeInTheDocument();
  });

  /**
   * 1234.56 must survive as exactly that. A value routed through a float could
   * surface as 1234.5599999999999, so the rendered text is checked directly.
   */
  it("renders money without floating-point corruption", () => {
    render(
      <TodaysSummaryCard summary={SUMMARY} isLoading={false} error={null} onRetry={() => {}} />,
    );

    expect(screen.getByText("₹1,234.56")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/1234\.5599|1,234\.5599/);
  });

  it("shows a loading state", () => {
    render(
      <TodaysSummaryCard summary={undefined} isLoading error={null} onRetry={() => {}} />,
    );
    expect(screen.getByText(/loading summary/i)).toBeInTheDocument();
  });

  it("shows an error state with a retry", async () => {
    const onRetry = vi.fn();
    const { ApiError } = await import("@/lib/api-error");
    render(
      <TodaysSummaryCard
        summary={undefined}
        isLoading={false}
        error={new ApiError("nope", 500, "INTERNAL_ERROR")}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText(/could not load the summary/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("ExpiringMembershipsCard", () => {
  it("lists memberships with the days remaining", async () => {
    renderWith(<ExpiringMembershipsCard libraryId={1} canView />, routeFetch());

    expect(await screen.findByText("Rahul Sharma")).toBeInTheDocument();
    expect(screen.getByText("6d")).toBeInTheDocument();
    expect(screen.getByText(/MEM001/)).toBeInTheDocument();
  });

  /** The 15-day default belongs to the backend, so no days parameter is sent. */
  it("lets the backend apply its own default window", async () => {
    const fetchMock = routeFetch();
    renderWith(<ExpiringMembershipsCard libraryId={1} canView />, fetchMock);

    await screen.findByText("Rahul Sharma");
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urls.some((u) => u.includes("/reports/expiring-memberships"))).toBe(true);
    expect(urls.some((u) => u.includes("days="))).toBe(false);
  });

  it("shows an empty state when nothing is expiring", async () => {
    renderWith(
      <ExpiringMembershipsCard libraryId={1} canView />,
      routeFetch({
        "GET /api/backend/libraries/1/reports/expiring-memberships": () => ok([]),
      }),
    );
    expect(await screen.findByText(/nothing expiring/i)).toBeInTheDocument();
  });

  it("handles a permission denial without firing the request", async () => {
    const fetchMock = routeFetch();
    renderWith(<ExpiringMembershipsCard libraryId={1} canView={false} />, fetchMock);

    expect(await screen.findByText(/not available to your role/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces a 403 from the API using the shared error handling", async () => {
    renderWith(
      <ExpiringMembershipsCard libraryId={1} canView />,
      routeFetch({
        "GET /api/backend/libraries/1/reports/expiring-memberships": () =>
          reply(403, { success: false, message: "Denied", data: null, errorCode: "FORBIDDEN" }),
      }),
    );

    expect(await screen.findByText(/could not load memberships/i)).toBeInTheDocument();
    expect(screen.getByText("You do not have permission to do that.")).toBeInTheDocument();
  });
});

describe("CollectionBreakdownCard", () => {
  it("shows the total and the method split exactly as returned", async () => {
    renderWith(<CollectionBreakdownCard libraryId={1} canView />, routeFetch());

    expect(await screen.findByText("₹2,200.00")).toBeInTheDocument();
    expect(screen.getByText("₹1,500.00")).toBeInTheDocument();
    expect(screen.getByText("₹700.00")).toBeInTheDocument();
    expect(screen.getByText("CASH")).toBeInTheDocument();
    expect(screen.getByText("UPI")).toBeInTheDocument();
  });

  it("shows an empty state when nothing was received", async () => {
    renderWith(
      <CollectionBreakdownCard libraryId={1} canView />,
      routeFetch({
        "GET /api/backend/libraries/1/reports/collection": () =>
          ok({ ...COLLECTION, totalCollected: "0.00", paymentCount: 0, byDay: [], byMethod: [] }),
      }),
    );
    expect(await screen.findByText(/no payments/i)).toBeInTheDocument();
  });
});

describe("OutstandingSummaryPanel", () => {
  it("renders invoiced, settled, outstanding and overdue as returned", async () => {
    renderWith(<OutstandingSummaryPanel libraryId={1} />, routeFetch());

    expect(await screen.findByText("₹4,400.00")).toBeInTheDocument();
    // Settled and outstanding are both 2200.00 in this fixture.
    expect(screen.getAllByText("₹2,200.00")).toHaveLength(2);
    expect(screen.getByText("₹1,500.00")).toBeInTheDocument();
    expect(screen.getByText("3 invoices")).toBeInTheDocument();
  });

  /** The panel displays the backend's arithmetic; it must not recompute it. */
  it("does not recalculate the outstanding figure in the browser", async () => {
    const fetchMock = routeFetch({
      "GET /api/backend/libraries/1/reports/outstanding": () =>
        ok({ ...OUTSTANDING, totalOutstanding: "0.01" }),
    });
    renderWith(<OutstandingSummaryPanel libraryId={1} />, fetchMock);

    // 4400.00 - 2200.00 would be 2200.00, but the API said 0.01 and the API wins.
    expect(await screen.findByText("₹0.01")).toBeInTheDocument();
  });

  it("shows a loading state then an error state with retry", async () => {
    renderWith(
      <OutstandingSummaryPanel libraryId={1} />,
      routeFetch({
        "GET /api/backend/libraries/1/reports/outstanding": () =>
          reply(403, { success: false, message: "Denied", data: null, errorCode: "FORBIDDEN" }),
      }),
    );

    expect(await screen.findByText(/could not load outstanding balances/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});

describe("CollectionReportPanel", () => {
  it("renders both breakdowns from the API without summing anything", async () => {
    renderWith(<CollectionReportPanel libraryId={1} />, routeFetch());

    expect(await screen.findByText("₹2,200.00")).toBeInTheDocument();
    expect(screen.getByText(/by day/i)).toBeInTheDocument();
    expect(screen.getByText(/by method/i)).toBeInTheDocument();
    expect(screen.getAllByText("₹1,500.00").length).toBeGreaterThanOrEqual(2);
  });

  it("sends the chosen dates to the backend", async () => {
    const fetchMock = routeFetch();
    renderWith(<CollectionReportPanel libraryId={1} />, fetchMock);

    await screen.findByText("₹2,200.00");
    fireChange(screen.getByLabelText(/collection from date/i), "2026-08-01");

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => c[0] as string);
      expect(urls.some((u) => u.includes("from=2026-08-01"))).toBe(true);
    });
  });

  it("surfaces a backend range error rather than validating the range itself", async () => {
    renderWith(
      <CollectionReportPanel libraryId={1} />,
      routeFetch({
        "GET /api/backend/libraries/1/reports/collection": () =>
          reply(400, {
            success: false,
            message: "Bad range",
            data: null,
            errorCode: "INVALID_REPORT_RANGE",
          }),
      }),
    );

    expect(await screen.findByText(/could not load the collection report/i)).toBeInTheDocument();
  });
});

describe("ExpiringMembershipsPanel", () => {
  it("defaults to 15 days and sends no parameter for it", async () => {
    const fetchMock = routeFetch();
    renderWith(<ExpiringMembershipsPanel libraryId={1} />, fetchMock);

    await screen.findByText("Rahul Sharma");
    expect(screen.getByLabelText(/expiry window/i)).toHaveValue("15");
    expect(fetchMock.mock.calls.map((c) => c[0] as string).some((u) => u.includes("days=")))
      .toBe(false);
  });

  it("sends a chosen window that the backend accepts", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch();
    renderWith(<ExpiringMembershipsPanel libraryId={1} />, fetchMock);

    await screen.findByText("Rahul Sharma");
    await user.selectOptions(screen.getByLabelText(/expiry window/i), "365");

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => c[0] as string);
      expect(urls.some((u) => u.includes("days=365"))).toBe(true);
    });
  });

  it("shows an empty result clearly", async () => {
    renderWith(
      <ExpiringMembershipsPanel libraryId={1} />,
      routeFetch({
        "GET /api/backend/libraries/1/reports/expiring-memberships": () => ok([]),
      }),
    );
    expect(await screen.findByText(/nothing expiring/i)).toBeInTheDocument();
  });
});

/** A date input takes a whole value at once rather than keystrokes. */
function fireChange(element: HTMLElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
}
