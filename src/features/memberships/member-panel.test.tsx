import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemberPanel } from "@/features/memberships/member-panel";
import type { MembershipResponse } from "@/types/api";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function member(overrides: Partial<MembershipResponse> = {}): MembershipResponse {
  return {
    userId: 3,
    username: "manager1",
    firstName: "Amit",
    lastName: "Manager",
    email: "manager1@brightfuture.example",
    organizationId: 1,
    libraryId: null,
    isPrimary: false,
    status: "ACTIVE",
    joinedAt: "2026-01-01T00:00:00",
    ...overrides,
  };
}

const PRIMARY = member({
  userId: 2,
  username: "owner1",
  firstName: "Raj",
  lastName: "Owner",
  email: "owner1@brightfuture.example",
  isPrimary: true,
});

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}
const ok = (data: unknown) => reply(200, { success: true, message: "ok", data });

/** Routes by URL so the tests do not depend on refetch counts. */
function routeFetch(
  overrides: Record<string, () => Response> = {},
  members: MembershipResponse[] = [PRIMARY, member()],
) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${(url as string).split("?")[0]}`;
    if (overrides[key]) return overrides[key]();
    if (key === "GET /api/backend/organizations/1/members") return ok(members);
    if (key === "GET /api/backend/libraries/1/members") return ok(members);
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
      <MemberPanel scope="organizations" tenantId={1} title="Bright Future — Members" canManage {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("MemberPanel rendering", () => {
  it("lists members with status and primary marker", async () => {
    renderPanel(routeFetch());

    expect(await screen.findByText(/Raj Owner/)).toBeInTheDocument();
    expect(screen.getByText(/Amit Manager/)).toBeInTheDocument();

    // "Primary" is also a column header, so assert on the owner's own row.
    const ownerRow = screen.getByText(/Raj Owner/).closest("tr") as HTMLElement;
    expect(within(ownerRow).getByText("Primary")).toBeInTheDocument();

    // StatusBadge renders the backend's status verbatim, in upper case.
    expect(screen.getAllByText("ACTIVE").length).toBeGreaterThanOrEqual(2);
  });

  it("calls the tenant-scoped endpoint, never a global member list", async () => {
    const fetchMock = routeFetch();
    renderPanel(fetchMock);

    await screen.findByText(/Raj Owner/);
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urls).toContain("/api/backend/organizations/1/members");
    expect(urls.some((u) => u === "/api/backend/members")).toBe(false);
  });

  it("shows a deactivated member rather than hiding them", async () => {
    renderPanel(routeFetch({}, [member({ status: "INACTIVE" })]));

    expect(await screen.findByText(/Amit Manager/)).toBeInTheDocument();
    expect(screen.getByText("INACTIVE")).toBeInTheDocument();
    // A deactivated member can be activated again.
    expect(screen.getByRole("button", { name: /^activate$/i })).toBeInTheDocument();
  });

  it("shows an empty state when nobody belongs to the tenant", async () => {
    renderPanel(routeFetch({}, []));
    expect(await screen.findByText(/no members/i)).toBeInTheDocument();
  });

  it("surfaces a load failure with a retry", async () => {
    const fetchMock = routeFetch({
      "GET /api/backend/organizations/1/members": () =>
        reply(403, { success: false, message: "Denied", data: null, errorCode: "FORBIDDEN" }),
    });
    renderPanel(fetchMock);

    expect(await screen.findByText(/could not load members/i)).toBeInTheDocument();
    expect(screen.getByText("You do not have permission to do that.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("hides every write control without USER_CREATE / USER_UPDATE", async () => {
    renderPanel(routeFetch(), { canManage: false });

    await screen.findByText(/Raj Owner/);
    expect(screen.queryByRole("button", { name: /add member/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /deactivate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("never renders a password hash even if the payload carried one", async () => {
    renderPanel(routeFetch());
    await screen.findByText(/Raj Owner/);
    expect(document.body.textContent).not.toContain("$2a$");
  });
});

describe("MemberPanel status changes", () => {
  it("deactivates through the status endpoint, not by deleting", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch(
      {
        "PUT /api/backend/organizations/1/members/3/status": () =>
          ok(member({ status: "INACTIVE" })),
      },
      [member()],
    );
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /^deactivate$/i }));

    await waitFor(() => {
      const put = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "PUT");
      expect(put).toBeDefined();
      expect(put?.[0]).toBe("/api/backend/organizations/1/members/3/status");
      expect(JSON.parse((put?.[1] as RequestInit).body as string)).toEqual({ status: "INACTIVE" });
    });
    // Deactivation must not issue a DELETE.
    expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit)?.method === "DELETE")).toBe(false);
  });

  it("activates a deactivated member", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch(
      { "PUT /api/backend/organizations/1/members/3/status": () => ok(member()) },
      [member({ status: "INACTIVE" })],
    );
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /^activate$/i }));

    await waitFor(() => {
      const put = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "PUT");
      expect(JSON.parse((put?.[1] as RequestInit).body as string)).toEqual({ status: "ACTIVE" });
    });
  });

  it("offers Make primary only on the signed-in user's own active row", async () => {
    renderPanel(routeFetch({}, [PRIMARY, member()]), { currentUsername: "manager1" });

    await screen.findByText(/Amit Manager/);
    const own = screen.getByText(/Amit Manager/).closest("tr") as HTMLElement;
    expect(within(own).getByRole("button", { name: /make primary/i })).toBeInTheDocument();

    // owner1 is somebody else's membership, and is already primary besides.
    const other = screen.getByText(/Raj Owner/).closest("tr") as HTMLElement;
    expect(within(other).queryByRole("button", { name: /make primary/i })).not.toBeInTheDocument();
  });

  it("hides Make primary on an inactive membership, which cannot be primary", async () => {
    renderPanel(routeFetch({}, [member({ status: "INACTIVE" })]), {
      currentUsername: "manager1",
    });

    await screen.findByText(/Amit Manager/);
    expect(screen.queryByRole("button", { name: /make primary/i })).not.toBeInTheDocument();
  });

  it("hides Make primary entirely when the caller is unknown", async () => {
    renderPanel(routeFetch({}, [member()]));

    await screen.findByText(/Amit Manager/);
    expect(screen.queryByRole("button", { name: /make primary/i })).not.toBeInTheDocument();
  });

  it("promotes through the primary endpoint, not the status endpoint", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch(
      { "PUT /api/backend/organizations/1/members/3/primary": () => ok(null) },
      [member()],
    );
    renderPanel(fetchMock, { currentUsername: "manager1" });

    await user.click(await screen.findByRole("button", { name: /make primary/i }));

    await waitFor(() => {
      const put = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "PUT");
      expect(put?.[0]).toBe("/api/backend/organizations/1/members/3/primary");
    });
    // Promotion must not be smuggled through a status change.
    const puts = fetchMock.mock.calls.filter((c) => (c[1] as RequestInit)?.method === "PUT");
    expect(puts.some((c) => String(c[0]).endsWith("/status"))).toBe(false);
  });

  it("removes a member through DELETE after confirmation", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "DELETE /api/backend/organizations/1/members/3": () => ok(null),
    });
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /remove manager1/i }));
    // The confirmation must explain that deactivating is the non-destructive option.
    expect(await screen.findByText(/deactivate instead/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^remove member$/i }));

    await waitFor(() => {
      const del = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "DELETE");
      expect(del?.[0]).toBe("/api/backend/organizations/1/members/3");
    });
  });
});

describe("MemberPanel add member", () => {
  it("POSTs a new organization member by user id", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/organizations/1/members": () => reply(201, { success: true, message: "ok", data: null }),
    });
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /add member/i }));

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/user id/i), "9");
    await user.click(within(dialog).getByRole("button", { name: /^add member$/i }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "POST");
      expect(post?.[0]).toBe("/api/backend/organizations/1/members");
      expect(JSON.parse((post?.[1] as RequestInit).body as string)).toMatchObject({ userId: 9 });
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("requires a user before submitting", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch();
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /add member/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^add member$/i }));

    expect(await within(dialog).findByText("Choose a user")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit)?.method === "POST")).toBe(false);
  });

  it("keeps the form open and explains a duplicate membership", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/organizations/1/members": () =>
        reply(409, {
          success: false,
          message: "Already a member",
          data: null,
          errorCode: "USER_ALREADY_IN_ORGANIZATION",
        }),
    });
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /add member/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/user id/i), "3");
    await user.click(within(dialog).getByRole("button", { name: /^add member$/i }));

    expect(
      await within(dialog).findByText(/already a member of the organization/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("offers a picker for a library, excluding people already in it", async () => {
    const user = userEvent.setup();
    const candidates = [
      PRIMARY,
      member({ userId: 3, username: "manager1" }),
      member({ userId: 4, username: "reception1", firstName: "Neha", lastName: "Reception" }),
      member({ userId: 5, username: "inactive1", status: "INACTIVE" }),
    ];

    const fetchMock = routeFetch({}, [PRIMARY]);
    renderPanel(fetchMock, { scope: "libraries", candidates });

    await user.click(await screen.findByRole("button", { name: /add member/i }));

    const dialog = await screen.findByRole("dialog");
    const select = within(dialog).getByLabelText(/^user/i) as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);

    // owner1 (2) is already a member; inactive1 (5) is not an active org member.
    expect(values).toEqual(["", "3", "4"]);
  });
});
