import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SeatForm } from "@/features/seats/seat-form";
import { ApiError } from "@/lib/api-error";
import type { SeatResponse } from "@/types/seat";

const ZONES = [
  { zoneId: 1, name: "GROUND", floor: "Ground Floor", description: null, status: "ACTIVE" },
  { zoneId: 2, name: "FIRST", floor: "First Floor", description: null, status: "ACTIVE" },
];

const TYPES = [
  { seatTypeId: 1, name: "STANDARD", description: null, price: 1500, status: "ACTIVE" },
  { seatTypeId: 2, name: "PREMIUM", description: null, price: 2000, status: "ACTIVE" },
];

function seat(overrides: Partial<SeatResponse> = {}): SeatResponse {
  return {
    seatId: 3,
    libraryId: 1,
    seatNumber: "A003",
    status: "AVAILABLE",
    zoneId: 1,
    zoneName: "GROUND",
    floor: "Ground Floor",
    seatTypeId: 2,
    seatTypeName: "PREMIUM",
    currentAllocation: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function renderForm(overrides: Partial<React.ComponentProps<typeof SeatForm>> = {}) {
  const onSubmit = vi.fn();
  render(
    <SeatForm
      zones={ZONES}
      seatTypes={TYPES}
      submitting={false}
      error={null}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
      {...overrides}
    />,
  );
  return { onSubmit };
}

describe("SeatForm validation", () => {
  it("requires a seat number", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.click(screen.getByRole("button", { name: /add seat/i }));

    expect(await screen.findByText("Seat number is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a seat number the backend pattern would reject", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/seat number/i), "@@@");
    await user.click(screen.getByRole("button", { name: /add seat/i }));

    expect(await screen.findByText(/may only contain letters, digits/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits seat number, zone and type as numbers", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/seat number/i), "C-101");
    await user.selectOptions(screen.getByLabelText(/zone/i), "2");
    await user.selectOptions(screen.getByLabelText(/seat type/i), "1");
    await user.click(screen.getByRole("button", { name: /add seat/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      seatNumber: "C-101",
      zoneId: 2,
      seatTypeId: 1,
      status: "AVAILABLE",
    });
  });

  it("sends null when zone and type are left unassigned", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/seat number/i), "C-102");
    await user.click(screen.getByRole("button", { name: /add seat/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ zoneId: null, seatTypeId: null });
  });

  it("never offers OCCUPIED, which the backend derives from an allocation", () => {
    renderForm();

    const select = screen.getByLabelText(/status/i) as HTMLSelectElement;
    const options = Array.from(select.options).map((option) => option.value);
    expect(options).toEqual(["AVAILABLE", "MAINTENANCE", "INACTIVE"]);
    expect(options).not.toContain("OCCUPIED");
  });

  it("locks the status of an allocated seat and omits it from the payload", async () => {
    const user = userEvent.setup();
    const allocated = seat({
      status: "OCCUPIED",
      currentAllocation: {
        assignmentId: 9,
        seatId: 3,
        seatNumber: "A003",
        studentId: 3,
        studentCode: "STU003",
        studentName: "Neha Verma",
        startDate: "2026-01-10",
        endDate: null,
        status: "ACTIVE",
      },
    });

    const { onSubmit } = renderForm({ seat: allocated });

    const status = screen.getByLabelText(/status/i) as HTMLSelectElement;
    expect(status).toBeDisabled();
    expect(screen.getByText(/release it to change its status/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save seat/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // The backend rejects a status change while allocated, so none is sent.
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("status");
  });
});

describe("SeatForm backend error handling", () => {
  it("pins a duplicate seat number to the seat number field", async () => {
    renderForm({ error: new ApiError("dup", 409, "SEAT_NUMBER_ALREADY_EXISTS", null) });

    expect(await screen.findByText(/seat number is already used/i)).toBeInTheDocument();
  });

  it("pins an invalid status to the status field", async () => {
    renderForm({ error: new ApiError("bad", 400, "INVALID_SEAT_STATUS", null) });

    expect(await screen.findByText(/not a valid seat status/i)).toBeInTheDocument();
  });

  it("pins VALIDATION_ERROR field messages to their inputs", async () => {
    renderForm({
      error: new ApiError("invalid", 400, "VALIDATION_ERROR", {
        seatNumber: "Seat number must not exceed 50 characters",
      }),
    });

    expect(
      await screen.findByText("Seat number must not exceed 50 characters"),
    ).toBeInTheDocument();
  });

  it("shows an unrelated failure as a form-level alert without leaking internals", async () => {
    renderForm({ error: new ApiError("stacktrace", 500, "INTERNAL_ERROR", null) });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong on the server. Please try again.");
    expect(alert).not.toHaveTextContent("stacktrace");
  });
});

/**
 * Seat numbers are generated by the backend and fixed for the life of the seat.
 *
 * The read-only input is a courtesy, not a control - SeatCountIntegrationTest
 * covers the API refusing a renumber. What these assert is that the product does
 * not invite the edit in the first place, and that the field still reaches the
 * backend, which requires it and compares it with the stored number.
 */
describe("SeatForm seat number is not editable", () => {
  it("renders the seat number read-only when editing an existing seat", () => {
    renderForm({ seat: seat() });

    const input = screen.getByLabelText(/seat number/i);
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveValue("A003");
  });

  it("leaves the seat number editable when adding a new seat", () => {
    renderForm();
    expect(screen.getByLabelText(/seat number/i)).not.toHaveAttribute("readonly");
  });

  it("says why the number cannot be changed", () => {
    renderForm({ seat: seat() });
    expect(screen.getByText(/cannot be changed/i)).toBeInTheDocument();
  });

  it("refuses typing into the number but still submits the original", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ seat: seat() });

    await user.type(screen.getByLabelText(/seat number/i), "99");
    await user.click(screen.getByRole("button", { name: /save seat/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // The value the backend receives is the one it issued, unchanged.
    expect(onSubmit.mock.calls[0][0].seatNumber).toBe("A003");
  });

  it("pins the backend's refusal to renumber onto the field", async () => {
    renderForm({
      seat: seat(),
      error: new ApiError(
        "Seat number cannot be changed. Seat A003 keeps the number it was created with.",
        400,
        "SEAT_NUMBER_NOT_EDITABLE",
      ),
    });

    expect(await screen.findByText(/keeps the number it was created with/i)).toBeInTheDocument();
  });

  it("still allows the status of an existing seat to be changed", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ seat: seat() });

    await user.selectOptions(screen.getByLabelText(/status/i), "MAINTENANCE");
    await user.click(screen.getByRole("button", { name: /save seat/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].status).toBe("MAINTENANCE");
  });
});
