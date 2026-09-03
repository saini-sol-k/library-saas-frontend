import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudentMembershipPanel } from "@/features/student-memberships/student-membership-panel";
import type { StudentMembershipResponse } from "@/types/api";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function membership(
  overrides: Partial<StudentMembershipResponse> = {},
): StudentMembershipResponse {
  return {
    membershipId: 3,
    libraryId: 1,
    studentId: 3,
    studentCode: "STU003",
    studentName: "Suresh Kumar",
    membershipNumber: "MEM003",
    startDate: "2026-02-15",
    endDate: "2026-08-31",
    status: "ACTIVE",
    autoRenew: false,
    expired: false,
    createdAt: "2026-02-15T00:00:00",
    updatedAt: "2026-02-15T00:00:00",
    version: 0,
    ...overrides,
  };
}

const STUDENT_PAGE = {
  content: [
    { id: 1, libraryId: 1, studentCode: "STU001", firstName: "Rahul", lastName: "Sharma", mobile: null, status: "ACTIVE" },
    { id: 3, libraryId: 1, studentCode: "STU003", firstName: "Suresh", lastName: "Kumar", mobile: null, status: "ACTIVE" },
  ],
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 100,
};

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}
const ok = (data: unknown) => reply(200, { success: true, message: "ok", data });

/** Routes by URL so the tests do not depend on refetch counts. */
function routeFetch(
  overrides: Record<string, () => Response> = {},
  rows: StudentMembershipResponse[] = [membership()],
) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const path = (url as string).split("?")[0];
    const key = `${init?.method ?? "GET"} ${path}`;
    if (overrides[key]) return overrides[key]();
    if (key === "GET /api/backend/libraries/1/student-memberships") return ok(rows);
    if (key === "GET /api/backend/students") return ok(STUDENT_PAGE);
    return ok(null);
  });
}

function renderPanel(fetchMock: ReturnType<typeof vi.fn>, props = {}) {
  vi.stubGlobal("fetch", fetchMock);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <StudentMembershipPanel libraryId={1} title="Bright Future — Student memberships" canManage {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("StudentMembershipPanel rendering", () => {
  it("lists memberships with period, status and number", async () => {
    renderPanel(routeFetch());

    expect(await screen.findByText(/Suresh Kumar/)).toBeInTheDocument();
    expect(screen.getByText("MEM003")).toBeInTheDocument();
    expect(screen.getByText(/2026-02-15/)).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  it("calls the library-scoped endpoint, never a global membership list", async () => {
    const fetchMock = routeFetch();
    renderPanel(fetchMock);

    await screen.findByText(/Suresh Kumar/);
    const urls = fetchMock.mock.calls.map((c) => (c[0] as string).split("?")[0]);
    expect(urls).toContain("/api/backend/libraries/1/student-memberships");
    expect(urls.some((u) => u === "/api/backend/student-memberships")).toBe(false);
  });

  it("keeps a cancelled membership visible rather than hiding it", async () => {
    renderPanel(routeFetch({}, [membership({ status: "CANCELLED" })]));

    expect(await screen.findByText(/Suresh Kumar/)).toBeInTheDocument();
    expect(screen.getByText("CANCELLED")).toBeInTheDocument();
    // A cancelled membership can be brought back.
    expect(screen.getByRole("button", { name: /reactivate/i })).toBeInTheDocument();
  });

  it("flags an active membership whose end date has passed", async () => {
    renderPanel(routeFetch({}, [membership({ expired: true, status: "ACTIVE" })]));

    expect(await screen.findByText(/past end date/i)).toBeInTheDocument();
  });

  it("does not flag a cancelled membership as past its end date", async () => {
    renderPanel(routeFetch({}, [membership({ expired: true, status: "CANCELLED" })]));

    await screen.findByText(/Suresh Kumar/);
    expect(screen.queryByText(/past end date/i)).not.toBeInTheDocument();
  });

  it("shows an empty state when the library has no memberships", async () => {
    renderPanel(routeFetch({}, []));
    expect(await screen.findByText(/no memberships/i)).toBeInTheDocument();
  });

  it("surfaces a load failure with a retry", async () => {
    const fetchMock = routeFetch({
      "GET /api/backend/libraries/1/student-memberships": () =>
        reply(403, { success: false, message: "Denied", data: null, errorCode: "FORBIDDEN" }),
    });
    renderPanel(fetchMock);

    expect(await screen.findByText(/could not load memberships/i)).toBeInTheDocument();
    expect(screen.getByText("You do not have permission to do that.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("hides every write control without STUDENT_UPDATE", async () => {
    renderPanel(routeFetch(), { canManage: false });

    await screen.findByText(/Suresh Kumar/);
    expect(screen.queryByRole("button", { name: /new membership/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /renew/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^cancel$/i })).not.toBeInTheDocument();
  });

  it("filters by status through the query string", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch();
    renderPanel(fetchMock);

    await screen.findByText(/Suresh Kumar/);
    await user.selectOptions(screen.getByLabelText(/filter by status/i), "CANCELLED");

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => c[0] as string);
      expect(urls.some((u) => u.includes("status=CANCELLED"))).toBe(true);
    });
  });
});

describe("StudentMembershipPanel create", () => {
  it("POSTs a new membership for a student of this library", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/libraries/1/student-memberships": () =>
        reply(201, { success: true, message: "ok", data: membership({ membershipId: 9 }) }),
    });
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /new membership/i }));

    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/^student/i), "3");
    await user.type(within(dialog).getByLabelText(/membership number/i), "MEM010");
    await user.type(within(dialog).getByLabelText(/start date/i), "2030-01-01");
    await user.type(within(dialog).getByLabelText(/end date/i), "2030-12-31");
    await user.click(within(dialog).getByRole("button", { name: /create membership/i }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "POST");
      expect(post?.[0]).toBe("/api/backend/libraries/1/student-memberships");
      expect(JSON.parse((post?.[1] as RequestInit).body as string)).toMatchObject({
        studentId: 3,
        membershipNumber: "MEM010",
        startDate: "2030-01-01",
        endDate: "2030-12-31",
      });
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("requires a student, a number and both dates before submitting", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch();
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /new membership/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /create membership/i }));

    expect(await within(dialog).findByText("Choose a student")).toBeInTheDocument();
    expect(within(dialog).getByText("Enter a membership number")).toBeInTheDocument();
    expect(within(dialog).getByText("Choose a start date")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit)?.method === "POST")).toBe(false);
  });

  it("rejects an end date on or before the start date without a round trip", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch();
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /new membership/i }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/^student/i), "3");
    await user.type(within(dialog).getByLabelText(/membership number/i), "MEM010");
    await user.type(within(dialog).getByLabelText(/start date/i), "2030-12-31");
    await user.type(within(dialog).getByLabelText(/end date/i), "2030-01-01");
    await user.click(within(dialog).getByRole("button", { name: /create membership/i }));

    expect(
      await within(dialog).findByText(/end date must be after the start date/i),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit)?.method === "POST")).toBe(false);
  });

  it("keeps the form open and explains a duplicate membership number", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/libraries/1/student-memberships": () =>
        reply(409, {
          success: false,
          message: "Taken",
          data: null,
          errorCode: "MEMBERSHIP_NUMBER_ALREADY_EXISTS",
        }),
    });
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /new membership/i }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/^student/i), "3");
    await user.type(within(dialog).getByLabelText(/membership number/i), "MEM003");
    await user.type(within(dialog).getByLabelText(/start date/i), "2030-01-01");
    await user.type(within(dialog).getByLabelText(/end date/i), "2030-12-31");
    await user.click(within(dialog).getByRole("button", { name: /create membership/i }));

    expect(
      await within(dialog).findByText(/membership number is already used/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("explains an overlapping period next to the end date", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/libraries/1/student-memberships": () =>
        reply(409, {
          success: false,
          message: "Overlap",
          data: null,
          errorCode: "STUDENT_MEMBERSHIP_OVERLAP",
        }),
    });
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /new membership/i }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/^student/i), "3");
    await user.type(within(dialog).getByLabelText(/membership number/i), "MEM010");
    await user.type(within(dialog).getByLabelText(/start date/i), "2026-03-01");
    await user.type(within(dialog).getByLabelText(/end date/i), "2026-04-01");
    await user.click(within(dialog).getByRole("button", { name: /create membership/i }));

    expect(
      await within(dialog).findByText(/already has an active membership covering those dates/i),
    ).toBeInTheDocument();
  });
});

describe("StudentMembershipPanel edit, renew and status", () => {
  it("PUTs an edit without sending a student id", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "PUT /api/backend/student-memberships/3": () => ok(membership({ endDate: "2026-09-30" })),
    });
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /^edit$/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      const put = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "PUT");
      expect(put?.[0]).toBe("/api/backend/student-memberships/3");
      const body = JSON.parse((put?.[1] as RequestInit).body as string);
      // A membership never moves between students, so the body carries no student.
      expect(body.studentId).toBeUndefined();
      expect(body.membershipNumber).toBe("MEM003");
    });
  });

  it("renews through the renew endpoint, not by editing the period", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/student-memberships/3/renew": () =>
        reply(201, { success: true, message: "ok", data: membership({ membershipId: 11 }) }),
    });
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /renew/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/membership number/i), "MEM004");
    await user.type(within(dialog).getByLabelText(/start date/i), "2026-09-01");
    await user.type(within(dialog).getByLabelText(/end date/i), "2027-08-31");
    await user.click(within(dialog).getByRole("button", { name: /renew membership/i }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "POST");
      expect(post?.[0]).toBe("/api/backend/student-memberships/3/renew");
    });
    // Renewing must not be smuggled through an update.
    expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit)?.method === "PUT")).toBe(false);
  });

  it("cancels through the status endpoint after confirmation, never a DELETE", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "PUT /api/backend/student-memberships/3/status": () => ok(membership({ status: "CANCELLED" })),
    });
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /^cancel$/i }));
    // The confirmation must say the record survives.
    expect(await screen.findByText(/record and its dates are kept/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /cancel membership/i }));

    await waitFor(() => {
      const put = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "PUT");
      expect(put?.[0]).toBe("/api/backend/student-memberships/3/status");
      expect(JSON.parse((put?.[1] as RequestInit).body as string)).toEqual({ status: "CANCELLED" });
    });
    expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit)?.method === "DELETE")).toBe(false);
  });

  it("reactivates a cancelled membership", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch(
      { "PUT /api/backend/student-memberships/3/status": () => ok(membership()) },
      [membership({ status: "CANCELLED" })],
    );
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /reactivate/i }));

    await waitFor(() => {
      const put = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "PUT");
      expect(JSON.parse((put?.[1] as RequestInit).body as string)).toEqual({ status: "ACTIVE" });
    });
  });
});
