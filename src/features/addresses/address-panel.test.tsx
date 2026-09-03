import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddressPanel } from "@/features/addresses/address-panel";
import type { AddressResponse } from "@/types/address";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const SEEDED: AddressResponse = {
  addressId: 7,
  firstName: null,
  lastName: null,
  addressLine1: "12 Court Road",
  addressLine2: null,
  addressLine3: null,
  landmark: null,
  city: "Saharanpur",
  district: null,
  state: "Uttar Pradesh",
  country: "India",
  postalCode: "247001",
  phone1: "+911234567890",
  phone2: null,
  email: null,
  addressType: "PERMANENT",
  isPrimary: true,
  createdAt: null,
  updatedAt: null,
};

/** Minimal Response stand-in matching what apiClient reads. */
function reply(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AddressPanel owner="students" ownerId={1} canEdit />
    </QueryClientProvider>,
  );
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("AddressPanel API integration", () => {
  it("loads and renders the addresses returned for the owner", async () => {
    fetchMock.mockResolvedValue(reply(200, { success: true, message: "ok", data: [SEEDED] }));

    renderPanel();

    expect(screen.getByText(/loading addresses/i)).toBeInTheDocument();

    expect(await screen.findByText(/12 Court Road/)).toBeInTheDocument();
    expect(screen.getByText("Permanent")).toBeInTheDocument();
    expect(screen.getByText("Primary")).toBeInTheDocument();

    // It must call the owner-scoped endpoint, never a standalone /addresses.
    expect(fetchMock.mock.calls[0][0]).toBe("/api/backend/students/1/addresses");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "GET" });
  });

  it("shows an empty state when the owner has no address yet", async () => {
    fetchMock.mockResolvedValue(reply(200, { success: true, message: "ok", data: [] }));

    renderPanel();

    expect(await screen.findByText(/no addresses yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add address/i })).toBeInTheDocument();
  });

  it("surfaces a load failure with a retry instead of an empty list", async () => {
    fetchMock.mockResolvedValue(
      reply(403, { success: false, message: "Denied", data: null, errorCode: "FORBIDDEN" }),
    );

    renderPanel();

    expect(await screen.findByText(/could not load addresses/i)).toBeInTheDocument();
    expect(screen.getByText("You do not have permission to do that.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("POSTs a new address and refreshes the list on success", async () => {
    const user = userEvent.setup();

    fetchMock
      .mockResolvedValueOnce(reply(200, { success: true, message: "ok", data: [] }))
      .mockResolvedValueOnce(
        reply(201, { success: true, message: "Address added", data: SEEDED }),
      )
      .mockResolvedValue(reply(200, { success: true, message: "ok", data: [SEEDED] }));

    renderPanel();

    await user.click(await screen.findByRole("button", { name: /add address/i }));

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/address line 1/i), "12 Court Road");
    await user.type(within(dialog).getByLabelText(/^city/i), "Saharanpur");
    await user.type(within(dialog).getByLabelText(/^state/i), "Uttar Pradesh");
    await user.type(within(dialog).getByLabelText(/postal code/i), "247001");

    await user.click(within(dialog).getByRole("button", { name: /add address/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/backend/students/1/addresses");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toMatchObject({
      addressLine1: "12 Court Road",
      city: "Saharanpur",
      state: "Uttar Pradesh",
      postalCode: "247001",
      addressType: "HOME",
    });

    // The dialog closes and the refreshed list is shown.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText(/12 Court Road/)).toBeInTheDocument();
  });

  it("keeps the form open and explains a 409 from the backend", async () => {
    const user = userEvent.setup();

    fetchMock
      .mockResolvedValueOnce(reply(200, { success: true, message: "ok", data: [] }))
      .mockResolvedValueOnce(
        reply(409, {
          success: false,
          message: "Address type already exists",
          data: null,
          errorCode: "ADDRESS_TYPE_ALREADY_EXISTS",
        }),
      );

    renderPanel();

    await user.click(await screen.findByRole("button", { name: /add address/i }));

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/address line 1/i), "12 Court Road");
    await user.type(within(dialog).getByLabelText(/^city/i), "Saharanpur");
    await user.type(within(dialog).getByLabelText(/^state/i), "Uttar Pradesh");
    await user.type(within(dialog).getByLabelText(/postal code/i), "247001");

    await user.click(within(dialog).getByRole("button", { name: /add address/i }));

    expect(
      await within(dialog).findByText(/an address of this type already exists/i),
    ).toBeInTheDocument();
    // The user's input is preserved so they can change the type and retry.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/address line 1/i)).toHaveValue("12 Court Road");
  });

  it("DELETEs through the owner-scoped endpoint after confirmation", async () => {
    const user = userEvent.setup();

    fetchMock
      .mockResolvedValueOnce(reply(200, { success: true, message: "ok", data: [SEEDED] }))
      .mockResolvedValueOnce(reply(200, { success: true, message: "Address removed", data: null }))
      .mockResolvedValue(reply(200, { success: true, message: "ok", data: [] }));

    renderPanel();

    await user.click(await screen.findByRole("button", { name: /remove permanent address/i }));
    await user.click(await screen.findByRole("button", { name: /^remove address$/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1][0]).toBe("/api/backend/students/1/addresses/7");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "DELETE" });
  });

  it("hides every write control when the user cannot edit", async () => {
    fetchMock.mockResolvedValue(reply(200, { success: true, message: "ok", data: [SEEDED] }));

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <AddressPanel owner="students" ownerId={1} canEdit={false} />
      </QueryClientProvider>,
    );

    await screen.findByText(/12 Court Road/);
    expect(screen.queryByRole("button", { name: /add/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });
});
