import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SeatBoard } from "@/features/seats/seat-board";
import type { SeatResponse } from "@/types/seat";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const ZONES = [{ zoneId: 1, name: "GROUND", floor: "Ground Floor", description: null, status: "ACTIVE" }];
const TYPES = [{ seatTypeId: 1, name: "STANDARD", description: null, price: 1500, status: "ACTIVE" }];

const STUDENTS = {
  content: [
    {
      id: 3,
      libraryId: 1,
      studentCode: "STU003",
      firstName: "Neha",
      lastName: "Verma",
      mobile: null,
      email: null,
      dateOfBirth: null,
      gender: null,
      joiningDate: "2026-01-01",
      status: "ACTIVE",
      createdAt: null,
    },
  ],
  totalElements: 1,
  totalPages: 1,
  page: 0,
  size: 50,
};

function seat(overrides: Partial<SeatResponse> = {}): SeatResponse {
  return {
    seatId: 3,
    libraryId: 1,
    seatNumber: "A003",
    status: "AVAILABLE",
    zoneId: 1,
    zoneName: "GROUND",
    floor: "Ground Floor",
    seatTypeId: 1,
    seatTypeName: "STANDARD",
    currentAllocation: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const OCCUPIED = seat({
  seatId: 1,
  seatNumber: "A001",
  status: "OCCUPIED",
  currentAllocation: {
    assignmentId: 1,
    seatId: 1,
    seatNumber: "A001",
    studentId: 1,
    studentCode: "STU001",
    studentName: "Rahul Sharma",
    startDate: "2026-01-10",
    endDate: null,
    status: "ACTIVE",
  },
});

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const ok = (data: unknown) => reply(200, { success: true, message: "ok", data });

/**
 * Routes by URL rather than by call order, so a test does not break when
 * React Query changes how many times it refetches.
 */
function routeFetch(overrides: Record<string, () => Response> = {}, seats: SeatResponse[] = [seat()]) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const key = `${method} ${url.split("?")[0]}`;
    if (overrides[key]) return overrides[key]();

    if (key === "GET /api/backend/libraries/1/seat-zones") return ok(ZONES);
    if (key === "GET /api/backend/libraries/1/seat-types") return ok(TYPES);
    if (key === "GET /api/backend/students") return ok(STUDENTS);
    if (key === "GET /api/backend/libraries/1/seats") return ok(seats);
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
      <SeatBoard libraryId={1} canManage canAssign {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("SeatBoard rendering", () => {
  it("renders seats with status and occupancy, and summarises them", async () => {
    renderBoard(routeFetch({}, [seat(), OCCUPIED]));

    expect(await screen.findByText("A003")).toBeInTheDocument();
    expect(screen.getByText("A001")).toBeInTheDocument();
    expect(screen.getByText("Rahul Sharma", { exact: false })).toBeInTheDocument();

    // Summary strip counts by status.
    const total = screen.getByText("Total").closest("div");
    expect(within(total as HTMLElement).getByText("2")).toBeInTheDocument();
  });

  it("calls the library-scoped endpoint, never a global seat list", async () => {
    const fetchMock = routeFetch();
    renderBoard(fetchMock);

    await screen.findByText("A003");
    const urls = fetchMock.mock.calls.map((call) => call[0] as string);
    expect(urls.some((u) => u.startsWith("/api/backend/libraries/1/seats"))).toBe(true);
    expect(urls.some((u) => u === "/api/backend/seats")).toBe(false);
  });

  it("shows an empty state when the library has no seats", async () => {
    renderBoard(routeFetch({}, []));

    expect(await screen.findByText(/no seats yet/i)).toBeInTheDocument();
  });

  it("surfaces a load failure with a retry", async () => {
    const fetchMock = routeFetch({
      "GET /api/backend/libraries/1/seats": () =>
        reply(403, { success: false, message: "Denied", data: null, errorCode: "FORBIDDEN" }),
    });
    renderBoard(fetchMock);

    expect(await screen.findByText(/could not load seats/i)).toBeInTheDocument();
    expect(screen.getByText("You do not have permission to do that.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("hides inventory controls without SEAT_CREATE / SEAT_UPDATE", async () => {
    renderBoard(routeFetch(), { canManage: false });

    await screen.findByText("A003");
    expect(screen.queryByRole("button", { name: /add seat/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit seat/i })).not.toBeInTheDocument();
    // SEAT_ASSIGN is still granted, so allocation stays available.
    expect(screen.getByRole("button", { name: /allocate/i })).toBeInTheDocument();
  });

  it("hides allocation controls without SEAT_ASSIGN", async () => {
    renderBoard(routeFetch(), { canAssign: false });

    await screen.findByText("A003");
    expect(screen.queryByRole("button", { name: /allocate/i })).not.toBeInTheDocument();
  });
});

describe("SeatBoard create", () => {
  it("POSTs a new seat and refreshes the grid", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/libraries/1/seats": () =>
        reply(201, { success: true, message: "Seat created", data: seat({ seatNumber: "C-101" }) }),
    });
    renderBoard(fetchMock);

    await user.click(await screen.findByRole("button", { name: /add seat/i }));

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/seat number/i), "C-101");
    await user.click(within(dialog).getByRole("button", { name: /add seat/i }));

    await waitFor(() => {
      const posted = fetchMock.mock.calls.find(
        (call) => (call[1] as RequestInit)?.method === "POST",
      );
      expect(posted).toBeDefined();
      expect(posted?.[0]).toBe("/api/backend/libraries/1/seats");
      expect(JSON.parse((posted?.[1] as RequestInit).body as string)).toMatchObject({
        seatNumber: "C-101",
        status: "AVAILABLE",
      });
    });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps the form open and explains a duplicate seat number", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/libraries/1/seats": () =>
        reply(409, {
          success: false,
          message: "Seat exists",
          data: null,
          errorCode: "SEAT_NUMBER_ALREADY_EXISTS",
        }),
    });
    renderBoard(fetchMock);

    await user.click(await screen.findByRole("button", { name: /add seat/i }));

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/seat number/i), "A003");
    await user.click(within(dialog).getByRole("button", { name: /add seat/i }));

    expect(await within(dialog).findByText(/already used in this library/i)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/seat number/i)).toHaveValue("A003");
  });
});

describe("SeatBoard allocation flow", () => {
  it("allocates a seat to a student and closes the dialog", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/libraries/1/seats/3/allocation": () =>
        reply(201, {
          success: true,
          message: "Seat allocated",
          data: {
            assignmentId: 5,
            seatId: 3,
            seatNumber: "A003",
            studentId: 3,
            studentCode: "STU003",
            studentName: "Neha Verma",
            startDate: "2026-09-03",
            endDate: null,
            status: "ACTIVE",
          },
        }),
    });
    renderBoard(fetchMock);

    await user.click(await screen.findByRole("button", { name: /allocate/i }));

    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByLabelText(/^student/i)).not.toBeDisabled(),
    );
    await user.selectOptions(within(dialog).getByLabelText(/^student/i), "3");
    await user.click(within(dialog).getByRole("button", { name: /allocate seat/i }));

    await waitFor(() => {
      const posted = fetchMock.mock.calls.find(
        (call) => (call[0] as string) === "/api/backend/libraries/1/seats/3/allocation",
      );
      expect(posted).toBeDefined();
      expect(JSON.parse((posted?.[1] as RequestInit).body as string)).toMatchObject({ studentId: 3 });
    });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("requires a student before allocating", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch();
    renderBoard(fetchMock);

    await user.click(await screen.findByRole("button", { name: /allocate/i }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /allocate seat/i }));

    expect(await within(dialog).findByText("Choose a student")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some((call) => (call[1] as RequestInit)?.method === "POST"),
    ).toBe(false);
  });

  it("explains a student who already holds a seat, next to the student field", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/libraries/1/seats/3/allocation": () =>
        reply(409, {
          success: false,
          message: "Already seated",
          data: null,
          errorCode: "STUDENT_ALREADY_HAS_SEAT",
        }),
    });
    renderBoard(fetchMock);

    await user.click(await screen.findByRole("button", { name: /allocate/i }));

    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByLabelText(/^student/i)).not.toBeDisabled(),
    );
    await user.selectOptions(within(dialog).getByLabelText(/^student/i), "3");
    await user.click(within(dialog).getByRole("button", { name: /allocate seat/i }));

    expect(
      await within(dialog).findByText(/already holds a seat/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("releases an occupied seat after confirmation", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch(
      {
        "DELETE /api/backend/libraries/1/seats/1/allocation": () =>
          ok({
            assignmentId: 1,
            seatId: 1,
            seatNumber: "A001",
            studentId: 1,
            studentCode: "STU001",
            studentName: "Rahul Sharma",
            startDate: "2026-01-10",
            endDate: "2026-09-03",
            status: "RELEASED",
          }),
      },
      [OCCUPIED],
    );
    renderBoard(fetchMock);

    await user.click(await screen.findByRole("button", { name: /release/i }));

    // The confirmation must not claim the action is irreversible.
    expect(await screen.findByText(/can be allocated again/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /release seat/i }));

    await waitFor(() => {
      const released = fetchMock.mock.calls.find(
        (call) =>
          (call[0] as string) === "/api/backend/libraries/1/seats/1/allocation" &&
          (call[1] as RequestInit)?.method === "DELETE",
      );
      expect(released).toBeDefined();
    });
  });

  it("retires a free seat through the seat endpoint, not the allocation one", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "DELETE /api/backend/libraries/1/seats/3": () => ok(seat({ status: "INACTIVE" })),
    });
    renderBoard(fetchMock);

    await user.click(await screen.findByRole("button", { name: /take seat a003 out of service/i }));
    await user.click(screen.getByRole("button", { name: /take out of service/i }));

    await waitFor(() => {
      const retired = fetchMock.mock.calls.find(
        (call) =>
          (call[0] as string) === "/api/backend/libraries/1/seats/3" &&
          (call[1] as RequestInit)?.method === "DELETE",
      );
      expect(retired).toBeDefined();
    });
  });
});

/**
 * Generated seats are the ordinary case now: a library onboarded with N seats
 * gets rows numbered "1".."N", so the board has to show plain numbers as
 * legibly as it shows the lettered ones, and editing one must not offer to
 * renumber it.
 */
describe("SeatBoard with generated seat numbers", () => {
  const GENERATED = [
    seat({ seatId: 11, seatNumber: "1", status: "AVAILABLE" }),
    seat({ seatId: 12, seatNumber: "2", status: "OCCUPIED" }),
    seat({ seatId: 13, seatNumber: "3", status: "MAINTENANCE" }),
  ];

  /**
   * Scoped to the seat grid on purpose: the summary strip above it also renders
   * bare digits, so an unscoped query for "1" would match a count as readily as
   * a seat and prove nothing about what the board shows.
   */
  function grid(container: HTMLElement) {
    const element = container.querySelector(".grid.grid-cols-1.gap-3");
    expect(element).not.toBeNull();
    return element as HTMLElement;
  }

  it("shows every generated number with its status", async () => {
    const { container } = renderBoard(routeFetch({}, GENERATED));

    await screen.findByRole("button", { name: /edit seat 1/i });
    const seats = grid(container);

    expect(within(seats).getByText("1")).toBeInTheDocument();
    expect(within(seats).getByText("2")).toBeInTheDocument();
    expect(within(seats).getByText("3")).toBeInTheDocument();
    expect(within(seats).getByText("Occupied")).toBeInTheDocument();
    expect(within(seats).getByText("Maintenance")).toBeInTheDocument();

    const total = screen.getByText("Total").closest("div");
    expect(within(total as HTMLElement).getByText("3")).toBeInTheDocument();
  });

  it("opens the edit dialog with the number locked", async () => {
    const user = userEvent.setup();
    renderBoard(routeFetch({}, GENERATED));

    await user.click(await screen.findByRole("button", { name: /edit seat 1/i }));

    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByLabelText(/seat number/i);
    expect(input).toHaveValue("1");
    expect(input).toHaveAttribute("readonly");
  });
});
