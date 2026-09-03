import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentPanel } from "@/features/student-profile/document-panel";
import { EmergencyContactPanel } from "@/features/student-profile/emergency-contact-panel";
import type { EmergencyContactResponse, StudentDocumentResponse } from "@/types/api";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function document(overrides: Partial<StudentDocumentResponse> = {}): StudentDocumentResponse {
  return {
    documentId: 1,
    studentId: 1,
    documentType: "AADHAAR",
    documentNumber: "XXXX-XXXX-1001",
    documentUrl: "students/1/aadhaar.pdf",
    status: "ACTIVE",
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function contact(overrides: Partial<EmergencyContactResponse> = {}): EmergencyContactResponse {
  return {
    emergencyContactId: 1,
    studentId: 1,
    firstName: "Ramesh",
    lastName: "Sharma",
    relationship: "FATHER",
    mobile: "9876599991",
    email: "ramesh@example.com",
    isPrimary: true,
    address: {
      addressLine1: "22 Station Road",
      city: "Saharanpur",
      state: "Uttar Pradesh",
      postalCode: "247001",
    },
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}
const ok = (data: unknown) => reply(200, { success: true, message: "ok", data });

function routeFetch(
  overrides: Record<string, () => Response> = {},
  documents: StudentDocumentResponse[] = [document()],
  contacts: EmergencyContactResponse[] = [contact()],
) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${(url as string).split("?")[0]}`;
    if (overrides[key]) return overrides[key]();
    if (key === "GET /api/backend/students/1/documents") return ok(documents);
    if (key === "GET /api/backend/students/1/emergency-contacts") return ok(contacts);
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

describe("DocumentPanel", () => {
  it("lists documents with their type, number and reference", async () => {
    renderWith(<DocumentPanel studentId={1} canManage />, routeFetch());

    expect(await screen.findByText("AADHAAR")).toBeInTheDocument();
    expect(screen.getByText("XXXX-XXXX-1001")).toBeInTheDocument();
    expect(screen.getByText("students/1/aadhaar.pdf")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  it("calls the student-scoped endpoint", async () => {
    const fetchMock = routeFetch();
    renderWith(<DocumentPanel studentId={1} canManage />, fetchMock);

    await screen.findByText("AADHAAR");
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urls).toContain("/api/backend/students/1/documents");
  });

  it("shows an empty state when nothing is filed", async () => {
    renderWith(<DocumentPanel studentId={1} canManage />, routeFetch({}, []));
    expect(await screen.findByText(/no documents/i)).toBeInTheDocument();
  });

  it("surfaces a load failure with a retry", async () => {
    renderWith(
      <DocumentPanel studentId={1} canManage />,
      routeFetch({
        "GET /api/backend/students/1/documents": () =>
          reply(403, { success: false, message: "Denied", data: null, errorCode: "FORBIDDEN" }),
      }),
    );

    expect(await screen.findByText(/could not load documents/i)).toBeInTheDocument();
    expect(screen.getByText("You do not have permission to do that.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("hides write controls without STUDENT_UPDATE", async () => {
    renderWith(<DocumentPanel studentId={1} canManage={false} />, routeFetch());

    await screen.findByText("AADHAAR");
    expect(screen.queryByRole("button", { name: /add document/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
  });

  /** The API stores a path, so a file picker would promise something it cannot do. */
  it("offers no upload control and no delete", async () => {
    const { container } = renderWith(<DocumentPanel studentId={1} canManage />, routeFetch());

    await screen.findByText("AADHAAR");
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /remove|delete/i })).not.toBeInTheDocument();
  });

  it("POSTs a new document", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/students/1/documents": () =>
        reply(201, { success: true, message: "ok", data: document({ documentId: 9 }) }),
    });
    renderWith(<DocumentPanel studentId={1} canManage />, fetchMock);

    await user.click(await screen.findByRole("button", { name: /add document/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/document type/i), "PASSPORT");
    await user.type(within(dialog).getByLabelText(/document number/i), "P123");
    await user.click(within(dialog).getByRole("button", { name: /record document/i }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "POST");
      expect(post?.[0]).toBe("/api/backend/students/1/documents");
      expect(JSON.parse((post?.[1] as RequestInit).body as string)).toEqual({
        documentType: "PASSPORT",
        documentNumber: "P123",
      });
    });
  });

  it("requires a document type before submitting", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch();
    renderWith(<DocumentPanel studentId={1} canManage />, fetchMock);

    await user.click(await screen.findByRole("button", { name: /add document/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /record document/i }));

    expect(await within(dialog).findByText(/document type is required/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit)?.method === "POST")).toBe(false);
  });

  it("PUTs an edit to the document endpoint", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "PUT /api/backend/student-documents/1": () => ok(document()),
    });
    renderWith(<DocumentPanel studentId={1} canManage />, fetchMock);

    await user.click(await screen.findByRole("button", { name: /edit/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      const put = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "PUT");
      expect(put?.[0]).toBe("/api/backend/student-documents/1");
      // A document never moves between students, so no student id is sent.
      expect(JSON.parse((put?.[1] as RequestInit).body as string).studentId).toBeUndefined();
    });
  });
});

describe("EmergencyContactPanel", () => {
  it("lists contacts with the primary marked", async () => {
    renderWith(<EmergencyContactPanel studentId={1} canManage />, routeFetch());

    expect(await screen.findByText("Ramesh Sharma")).toBeInTheDocument();
    expect(screen.getByText("FATHER")).toBeInTheDocument();
    const row = screen.getByText("Ramesh Sharma").closest("tr") as HTMLElement;
    expect(within(row).getByText("Primary")).toBeInTheDocument();
    expect(within(row).getByText(/22 Station Road/)).toBeInTheDocument();
  });

  it("handles a contact with no address", async () => {
    renderWith(
      <EmergencyContactPanel studentId={1} canManage />,
      routeFetch({}, [document()], [contact({ address: null, isPrimary: false })]),
    );

    expect(await screen.findByText("Ramesh Sharma")).toBeInTheDocument();
    const row = screen.getByText("Ramesh Sharma").closest("tr") as HTMLElement;
    expect(within(row).queryByText("Primary")).not.toBeInTheDocument();
  });

  it("shows an empty state and hides write controls without permission", async () => {
    renderWith(
      <EmergencyContactPanel studentId={1} canManage={false} />,
      routeFetch({}, [document()], []),
    );

    expect(await screen.findByText(/no emergency contacts/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add contact/i })).not.toBeInTheDocument();
  });

  it("surfaces a load failure with a retry", async () => {
    renderWith(
      <EmergencyContactPanel studentId={1} canManage />,
      routeFetch({
        "GET /api/backend/students/1/emergency-contacts": () =>
          reply(403, { success: false, message: "Denied", data: null, errorCode: "FORBIDDEN" }),
      }),
    );

    expect(await screen.findByText(/could not load contacts/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  /** The address is always inline; there is no id to send and no picker to offer. */
  it("POSTs a contact with the address nested and no address id", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/students/1/emergency-contacts": () =>
        reply(201, { success: true, message: "ok", data: contact({ emergencyContactId: 9 }) }),
    });
    renderWith(<EmergencyContactPanel studentId={1} canManage />, fetchMock);

    await user.click(await screen.findByRole("button", { name: /add contact/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/first name/i), "Anita");
    await user.type(within(dialog).getByLabelText(/relationship/i), "SISTER");
    await user.type(within(dialog).getByLabelText(/address line 1/i), "12 Park Road");
    await user.type(within(dialog).getByLabelText(/^city/i), "Dehradun");
    await user.type(within(dialog).getByLabelText(/^state/i), "Uttarakhand");
    await user.type(within(dialog).getByLabelText(/postal code/i), "248001");
    await user.click(within(dialog).getByRole("button", { name: /add contact/i }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "POST");
      expect(post?.[0]).toBe("/api/backend/students/1/emergency-contacts");
      const body = JSON.parse((post?.[1] as RequestInit).body as string);
      expect(body.firstName).toBe("Anita");
      expect(body.address).toMatchObject({ addressLine1: "12 Park Road", city: "Dehradun" });
      // No id anywhere: an address can never be attached by reference.
      expect(body.addressId).toBeUndefined();
      expect(body.address.addressId).toBeUndefined();
    });
  });

  it("rejects a half-filled address before sending", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch();
    renderWith(<EmergencyContactPanel studentId={1} canManage />, fetchMock);

    await user.click(await screen.findByRole("button", { name: /add contact/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/first name/i), "Anita");
    // Only line 1 given; city, state and postal code are still blank.
    await user.type(within(dialog).getByLabelText(/address line 1/i), "12 Park Road");
    await user.click(within(dialog).getByRole("button", { name: /add contact/i }));

    expect(
      (await within(dialog).findAllByText(/required when an address is given/i)).length,
    ).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit)?.method === "POST")).toBe(false);
  });

  it("rejects a malformed mobile number", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch();
    renderWith(<EmergencyContactPanel studentId={1} canManage />, fetchMock);

    await user.click(await screen.findByRole("button", { name: /add contact/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/first name/i), "Anita");
    await user.type(within(dialog).getByLabelText(/mobile/i), "abc");
    await user.click(within(dialog).getByRole("button", { name: /add contact/i }));

    expect(await within(dialog).findByText(/valid contact number/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit)?.method === "POST")).toBe(false);
  });

  it("sends the primary flag when the contact is promoted", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch(
      { "PUT /api/backend/student-emergency-contacts/1": () => ok(contact()) },
      [document()],
      [contact({ isPrimary: false })],
    );
    renderWith(<EmergencyContactPanel studentId={1} canManage />, fetchMock);

    await user.click(await screen.findByRole("button", { name: /^edit$/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByLabelText(/primary contact/i));
    await user.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      const put = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "PUT");
      expect(put?.[0]).toBe("/api/backend/student-emergency-contacts/1");
      expect(JSON.parse((put?.[1] as RequestInit).body as string).isPrimary).toBe(true);
    });
  });

  /** Leaving the address blank on an edit must not clear the one on file. */
  it("omits the address entirely when its fields are left blank", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch(
      { "PUT /api/backend/student-emergency-contacts/1": () => ok(contact()) },
      [document()],
      [contact({ address: null })],
    );
    renderWith(<EmergencyContactPanel studentId={1} canManage />, fetchMock);

    await user.click(await screen.findByRole("button", { name: /^edit$/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      const put = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "PUT");
      expect(JSON.parse((put?.[1] as RequestInit).body as string).address).toBeUndefined();
    });
  });

  it("explains that the address survives a removal, and DELETEs the contact only", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "DELETE /api/backend/student-emergency-contacts/1": () => ok(null),
    });
    renderWith(<EmergencyContactPanel studentId={1} canManage />, fetchMock);

    await user.click(await screen.findByRole("button", { name: /remove ramesh/i }));
    expect(await screen.findByText(/address on file is kept/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^remove contact$/i }));

    await waitFor(() => {
      const del = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "DELETE");
      expect(del?.[0]).toBe("/api/backend/student-emergency-contacts/1");
    });
  });
});
