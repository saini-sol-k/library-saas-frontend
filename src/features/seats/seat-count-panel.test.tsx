import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SeatCountPanel } from "@/features/seats/seat-count-panel";
import { ApiError } from "@/lib/api-error";
import { hasAuthority } from "@/lib/jwt";
import { tenantService } from "@/services/tenant";
import type { LibraryResponse } from "@/types/api";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function library(overrides: Partial<LibraryResponse> = {}): LibraryResponse {
  return {
    libraryId: 7,
    organizationId: 2,
    libraryCode: "LIB-A",
    name: "Library A",
    description: null,
    email: null,
    mobile: null,
    status: "ACTIVE",
    openingTime: null,
    closingTime: null,
    timezone: "Asia/Kolkata",
    currency: "INR",
    seatCount: 100,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** Types a seat count into the panel and saves it. */
async function save(value: string) {
  const user = userEvent.setup();
  const input = screen.getByLabelText(/number of seats/i);
  await user.clear(input);
  if (value !== "") {
    await user.type(input, value);
  }
  await user.click(screen.getByRole("button", { name: /^save$/i }));
}

describe("SeatCountPanel", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows the library's current number of seats", () => {
    wrap(<SeatCountPanel library={library()} />);

    expect(screen.getByText("Library configuration")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByLabelText(/number of seats/i)).toHaveValue(100);
  });

  it("says that seat numbers are generated and cannot be renumbered", () => {
    wrap(<SeatCountPanel library={library()} />);
    expect(screen.getByText(/cannot be renumbered/i)).toBeInTheDocument();
  });

  it("sends the new count as a number", async () => {
    const patch = vi.spyOn(tenantService, "updateSeatCount").mockResolvedValue({
      libraryId: 7,
      libraryName: "Library A",
      previousSeatCount: 100,
      seatCount: 120,
      seatsCreated: 20,
      seatsReactivated: 0,
      seatsRemoved: 0,
      seatsRetired: 0,
      seatsAdded: 20,
      seatsWithdrawn: 0,
      seatRange: "101 - 120",
    });

    wrap(<SeatCountPanel library={library()} />);
    await save("120");

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch).toHaveBeenCalledWith(7, { seatCount: 120 });
  });

  it("rejects zero without calling the backend", async () => {
    const patch = vi.spyOn(tenantService, "updateSeatCount");

    wrap(<SeatCountPanel library={library()} />);
    await save("0");

    expect(await screen.findByText("Number of seats must be greater than 0.")).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();
  });

  it("rejects a decimal without calling the backend", async () => {
    const patch = vi.spyOn(tenantService, "updateSeatCount");

    wrap(<SeatCountPanel library={library()} />);
    await save("5.5");

    expect(await screen.findByText("Number of seats must be a whole number.")).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();
  });

  it("rejects a count above the limit without calling the backend", async () => {
    const patch = vi.spyOn(tenantService, "updateSeatCount");

    wrap(<SeatCountPanel library={library()} />);
    await save("10001");

    expect(await screen.findByText("Number of seats cannot exceed 10000.")).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();
  });

  it("requires a value", async () => {
    const patch = vi.spyOn(tenantService, "updateSeatCount");

    wrap(<SeatCountPanel library={library()} />);
    await save("");

    expect(await screen.findByText("Number of seats is required.")).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();
  });

  /**
   * A refused reduction names the seats standing in the way, so it belongs on the
   * field the user just typed into rather than in a generic banner.
   */
  it("shows a refused reduction against the field", async () => {
    vi.spyOn(tenantService, "updateSeatCount").mockRejectedValue(
      new ApiError(
        "Seat count cannot be reduced to 5 because seat 7 is currently in use.",
        409,
        "SEAT_COUNT_REDUCTION_BLOCKED",
      ),
    );

    wrap(<SeatCountPanel library={library()} />);
    await save("5");

    expect(await screen.findByText(/seat 7 is currently in use/i)).toBeInTheDocument();
  });
});

/**
 * Who sees the panel at all. The backend gates the endpoint on LIBRARY_UPDATE and
 * additionally on membership of the library, so this is presentation only - but a
 * control that always 403s is a bug in its own right.
 */
describe("Seat count visibility", () => {
  it("is available to a role holding LIBRARY_UPDATE", () => {
    expect(hasAuthority(["ROLE_ORGANIZATION_OWNER", "LIBRARY_UPDATE"], "LIBRARY_UPDATE")).toBe(true);
  });

  it("is hidden from a receptionist", () => {
    // V1 grants a receptionist LIBRARY_VIEW, SEAT_VIEW and SEAT_ASSIGN, never
    // LIBRARY_UPDATE.
    const receptionist = ["ROLE_RECEPTIONIST", "LIBRARY_VIEW", "SEAT_VIEW", "SEAT_ASSIGN"];
    expect(hasAuthority(receptionist, "LIBRARY_UPDATE")).toBe(false);
  });

  it("is hidden from a library manager, who may create seats but not resize the library", () => {
    const manager = ["ROLE_LIBRARY_MANAGER", "LIBRARY_VIEW", "SEAT_VIEW", "SEAT_CREATE", "SEAT_UPDATE"];
    expect(hasAuthority(manager, "LIBRARY_UPDATE")).toBe(false);
  });

  it("is hidden from library staff, who hold no permissions at all", () => {
    expect(hasAuthority(["ROLE_LIBRARY_STAFF"], "LIBRARY_UPDATE")).toBe(false);
  });
});

/**
 * The limit is stated on the form, not just enforced by it. Asserted because a
 * template literal that loses its interpolation still renders - as "Up to ." -
 * and reads as finished text.
 */
describe("SeatCountPanel hint", () => {
  it("names the maximum the backend will accept", () => {
    wrap(<SeatCountPanel library={library()} />);
    expect(screen.getByText(/up to 10000\./i)).toBeInTheDocument();
  });
});
