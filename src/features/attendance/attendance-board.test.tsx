import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttendanceBoard } from "@/features/attendance/attendance-board";
import type { AttendanceResponse } from "@/types/api";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const TODAY = new Date().toISOString().slice(0, 10);

function visit(overrides: Partial<AttendanceResponse> = {}): AttendanceResponse {
  return {
    attendanceId: 2,
    libraryId: 1,
    studentId: 2,
    studentCode: "STU002",
    studentName: "Priya Verma",
    seatId: 2,
    seatNumber: "A002",
    attendanceDate: TODAY,
    checkInTime: `${TODAY}T09:00:00`,
    checkOutTime: null,
    durationMinutes: null,
    status: "PRESENT",
    open: true,
    ...overrides,
  };
}

const CLOSED = visit({
  attendanceId: 1,
  studentId: 1,
  studentCode: "STU001",
  studentName: "Rahul Sharma",
  seatId: 1,
  seatNumber: "A001",
  checkOutTime: `${TODAY}T12:00:00`,
  durationMinutes: 180,
  status: "COMPLETED",
  open: false,
});

const STUDENT_PAGE = {
  content: [
    { id: 3, libraryId: 1, studentCode: "STU003", firstName: "Suresh", lastName: "Kumar", mobile: null, status: "ACTIVE" },
  ],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 50,
};

const SEATS = [
  { seatId: 3, libraryId: 1, seatNumber: "A003", status: "AVAILABLE", zoneId: null, zoneName: null, floor: null, seatTypeId: null, seatTypeName: null, currentAllocation: null, createdAt: null },
];

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}
const ok = (data: unknown) => reply(200, { success: true, message: "ok", data });

/** Routes by URL so the tests do not depend on refetch counts. */
function routeFetch(
  overrides: Record<string, () => Response> = {},
  rows: AttendanceResponse[] = [visit(), CLOSED],
) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const path = (url as string).split("?")[0];
    const key = `${init?.method ?? "GET"} ${path}`;
    if (overrides[key]) return overrides[key]();
    if (key === "GET /api/backend/libraries/1/attendance") return ok(rows);
    if (key === "GET /api/backend/students") return ok(STUDENT_PAGE);
    if (key === "GET /api/backend/libraries/1/seats") return ok(SEATS);
    return ok(null);
  });
}

function renderBoard(fetchMock: ReturnType<typeof vi.fn>, props = {}) {
  vi.stubGlobal("fetch", fetchMock);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AttendanceBoard libraryId={1} title="Bright Future — Today" canManage {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("AttendanceBoard rendering", () => {
  it("lists visits with seat, times and duration", async () => {
    renderBoard(routeFetch());

    expect(await screen.findByText(/Priya Verma/)).toBeInTheDocument();
    expect(screen.getByText(/Rahul Sharma/)).toBeInTheDocument();
    expect(screen.getByText("A002")).toBeInTheDocument();
    // 180 minutes reads as hours, and an open visit has no duration.
    expect(screen.getByText("3h")).toBeInTheDocument();
  });

  it("calls the library-scoped endpoint, never a global attendance list", async () => {
    const fetchMock = routeFetch();
    renderBoard(fetchMock);

    await screen.findByText(/Priya Verma/);
    const urls = fetchMock.mock.calls.map((c) => (c[0] as string).split("?")[0]);
    expect(urls).toContain("/api/backend/libraries/1/attendance");
    expect(urls.some((u) => u === "/api/backend/attendance")).toBe(false);
  });

  it("offers Check out only on an open visit", async () => {
    renderBoard(routeFetch());

    await screen.findByText(/Priya Verma/);
    const openRow = screen.getByText(/Priya Verma/).closest("tr") as HTMLElement;
    expect(within(openRow).getByRole("button", { name: /check out/i })).toBeInTheDocument();

    const closedRow = screen.getByText(/Rahul Sharma/).closest("tr") as HTMLElement;
    expect(within(closedRow).queryByRole("button", { name: /check out/i })).not.toBeInTheDocument();
    expect(within(closedRow).getByText("Closed")).toBeInTheDocument();
  });

  it("shows an empty state when nobody has checked in", async () => {
    renderBoard(routeFetch({}, []));
    expect(await screen.findByText(/no attendance/i)).toBeInTheDocument();
  });

  it("surfaces a load failure with a retry", async () => {
    const fetchMock = routeFetch({
      "GET /api/backend/libraries/1/attendance": () =>
        reply(403, { success: false, message: "Denied", data: null, errorCode: "FORBIDDEN" }),
    });
    renderBoard(fetchMock);

    expect(await screen.findByText(/could not load attendance/i)).toBeInTheDocument();
    expect(screen.getByText("You do not have permission to do that.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("hides every write control without ATTENDANCE_CREATE", async () => {
    renderBoard(routeFetch(), { canManage: false });

    await screen.findByText(/Priya Verma/);
    expect(screen.queryByRole("button", { name: /check in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /check out/i })).not.toBeInTheDocument();
  });

  it("hides check-in on the read-only history view", async () => {
    renderBoard(routeFetch(), { showCheckIn: false });

    await screen.findByText(/Priya Verma/);
    expect(screen.queryByRole("button", { name: /check in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /check out/i })).not.toBeInTheDocument();
  });

  it("filters by status through the query string", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch();
    renderBoard(fetchMock);

    await screen.findByText(/Priya Verma/);
    await user.selectOptions(screen.getByLabelText(/filter by status/i), "PRESENT");

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => c[0] as string);
      expect(urls.some((u) => u.includes("status=PRESENT"))).toBe(true);
    });
  });

  it("reads another day through the date parameter and hides check-in for it", async () => {
    const fetchMock = routeFetch();
    renderBoard(fetchMock);

    await screen.findByText(/Priya Verma/);
    // A date input takes a whole value at once; typing into it character by
    // character is not how the control behaves.
    fireEvent.change(screen.getByLabelText(/attendance date/i), {
      target: { value: "2020-01-01" },
    });

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => c[0] as string);
      expect(urls.some((u) => u.includes("date=2020-01-01"))).toBe(true);
    });
    // Checking in always records "now", so it makes no sense on a past day.
    expect(screen.queryByRole("button", { name: /^check in$/i })).not.toBeInTheDocument();
  });
});

describe("AttendanceBoard check-in and check-out", () => {
  it("POSTs a check-in for a student of this library", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/libraries/1/attendance/check-in": () =>
        reply(201, { success: true, message: "ok", data: visit({ attendanceId: 9, studentId: 3 }) }),
    });
    renderBoard(fetchMock);

    await user.click(await screen.findByRole("button", { name: /^check in$/i }));

    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/^student/i), "3");
    await user.click(within(dialog).getByRole("button", { name: /^check in$/i }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "POST");
      expect(post?.[0]).toBe("/api/backend/libraries/1/attendance/check-in");
      // No seat chosen, so none is sent and the backend uses the allocation.
      expect(JSON.parse((post?.[1] as RequestInit).body as string)).toEqual({ studentId: 3 });
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("sends an explicitly chosen seat", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/libraries/1/attendance/check-in": () =>
        reply(201, { success: true, message: "ok", data: visit({ attendanceId: 9 }) }),
    });
    renderBoard(fetchMock);

    await user.click(await screen.findByRole("button", { name: /^check in$/i }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/^student/i), "3");
    await user.selectOptions(within(dialog).getByLabelText(/^seat/i), "3");
    await user.click(within(dialog).getByRole("button", { name: /^check in$/i }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "POST");
      expect(JSON.parse((post?.[1] as RequestInit).body as string)).toEqual({
        studentId: 3,
        seatId: 3,
      });
    });
  });

  it("requires a student before submitting", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch();
    renderBoard(fetchMock);

    await user.click(await screen.findByRole("button", { name: /^check in$/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^check in$/i }));

    expect(await within(dialog).findByText("Choose a student")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit)?.method === "POST")).toBe(false);
  });

  it("keeps the form open and explains a student who is already in", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/libraries/1/attendance/check-in": () =>
        reply(409, {
          success: false,
          message: "Already in",
          data: null,
          errorCode: "STUDENT_ALREADY_CHECKED_IN",
        }),
    });
    renderBoard(fetchMock);

    await user.click(await screen.findByRole("button", { name: /^check in$/i }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/^student/i), "3");
    await user.click(within(dialog).getByRole("button", { name: /^check in$/i }));

    expect(await within(dialog).findByText(/already checked in/i)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("explains a student from another library next to the student field", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/libraries/1/attendance/check-in": () =>
        reply(400, {
          success: false,
          message: "Wrong library",
          data: null,
          errorCode: "STUDENT_NOT_IN_LIBRARY",
        }),
    });
    renderBoard(fetchMock);

    await user.click(await screen.findByRole("button", { name: /^check in$/i }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/^student/i), "3");
    await user.click(within(dialog).getByRole("button", { name: /^check in$/i }));

    expect(
      await within(dialog).findByText(/does not belong to this library/i),
    ).toBeInTheDocument();
  });

  it("checks out through the check-out endpoint, never a DELETE", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/attendance/2/check-out": () =>
        ok(visit({ status: "COMPLETED", open: false, durationMinutes: 45 })),
    });
    renderBoard(fetchMock);

    await user.click(await screen.findByRole("button", { name: /check out/i }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "POST");
      expect(post?.[0]).toBe("/api/backend/attendance/2/check-out");
    });
    expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit)?.method === "DELETE")).toBe(false);
  });
});
