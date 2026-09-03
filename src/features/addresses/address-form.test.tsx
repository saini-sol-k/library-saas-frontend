import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddressForm } from "@/features/addresses/address-form";
import { ApiError } from "@/lib/api-error";
import { PERSONAL_ADDRESS_TYPES } from "@/types/address";

function renderForm(overrides: Partial<React.ComponentProps<typeof AddressForm>> = {}) {
  const onSubmit = vi.fn();
  render(
    <AddressForm
      addressTypes={PERSONAL_ADDRESS_TYPES}
      submitting={false}
      error={null}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
      {...overrides}
    />,
  );
  return { onSubmit };
}

describe("AddressForm validation", () => {
  it("blocks submission and names every required field when the form is empty", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.click(screen.getByRole("button", { name: /add address/i }));

    expect(await screen.findByText("Address line 1 is required")).toBeInTheDocument();
    expect(screen.getByText("City is required")).toBeInTheDocument();
    expect(screen.getByText("State is required")).toBeInTheDocument();
    expect(screen.getByText("Postal code is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a postal code and phone the backend pattern would reject", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/address line 1/i), "12 Test Lane");
    await user.type(screen.getByLabelText(/^city/i), "Saharanpur");
    await user.type(screen.getByLabelText(/^state/i), "Uttar Pradesh");
    await user.type(screen.getByLabelText(/postal code/i), "@@");
    await user.type(screen.getByLabelText(/^phone/i), "abc");

    await user.click(screen.getByRole("button", { name: /add address/i }));

    expect(
      await screen.findByText(/postal code may only contain letters, digits/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/phone must be a valid contact number/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the filled values and drops empty optional fields", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/address line 1/i), "12 Test Lane");
    await user.type(screen.getByLabelText(/^city/i), "Saharanpur");
    await user.type(screen.getByLabelText(/^state/i), "Uttar Pradesh");
    await user.type(screen.getByLabelText(/postal code/i), "247001");
    await user.click(screen.getByLabelText(/use as the primary address/i));

    await user.click(screen.getByRole("button", { name: /add address/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      addressLine1: "12 Test Lane",
      city: "Saharanpur",
      state: "Uttar Pradesh",
      postalCode: "247001",
      country: "India",
      // HOME is the default: it is the first free type and what the schema seeds.
      addressType: "HOME",
      isPrimary: true,
    });
    // pruneEmpty must not send blank strings the backend would store as data.
    expect(payload).not.toHaveProperty("landmark");
    expect(payload).not.toHaveProperty("phone2");
  });

  it("offers only address types the backend accepts, disabling ones already used", () => {
    renderForm({ takenTypes: ["HOME"] });

    const select = screen.getByLabelText(/address type/i) as HTMLSelectElement;
    const options = Array.from(select.options).map((option) => option.value);
    // HOME must be offered: it is the type V1__initial_schema.sql seeds.
    expect(options).toEqual(["HOME", "PERMANENT", "CURRENT", "CORRESPONDENCE", "OTHER"]);

    // The backend enforces one per type for every type, OTHER included.
    expect(select.options[0]).toBeDisabled();
    // The first free type is preselected.
    expect(select.value).toBe("PERMANENT");
  });

  it("locks the type when editing, because the backend keys the link on it", async () => {
    const user = userEvent.setup();
    const existing = {
      addressId: 4,
      firstName: null,
      lastName: null,
      addressLine1: "House 101",
      addressLine2: null,
      addressLine3: null,
      landmark: null,
      city: "Saharanpur",
      district: null,
      state: "Uttar Pradesh",
      country: "India",
      postalCode: "247001",
      phone1: null,
      phone2: null,
      email: null,
      addressType: "HOME",
      isPrimary: true,
      createdAt: null,
      updatedAt: null,
    };

    const { onSubmit } = renderForm({ address: existing });

    const select = screen.getByLabelText(/address type/i) as HTMLSelectElement;
    expect(select).toBeDisabled();
    expect(select.value).toBe("HOME");

    await user.click(screen.getByRole("button", { name: /save address/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // A disabled select submits nothing, so the existing type is sent back.
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ addressType: "HOME" });
  });
});

describe("AddressForm backend error handling", () => {
  it("pins VALIDATION_ERROR field messages to the inputs they belong to", async () => {
    renderForm({
      error: new ApiError("Validation failed", 400, "VALIDATION_ERROR", {
        addressLine1: "Address line 1 must not exceed 250 characters",
        city: "City must not be blank",
      }),
    });

    expect(
      await screen.findByText("Address line 1 must not exceed 250 characters"),
    ).toBeInTheDocument();
    expect(screen.getByText("City must not be blank")).toBeInTheDocument();
    // A field error is not also duplicated as a form-level banner.
    expect(screen.queryByText(/please correct the highlighted fields/i)).not.toBeInTheDocument();
  });

  it("pins ADDRESS_TYPE_ALREADY_EXISTS to the address type field", async () => {
    renderForm({
      error: new ApiError("Duplicate", 409, "ADDRESS_TYPE_ALREADY_EXISTS", null),
    });

    expect(await screen.findByText(/an address of this type already exists/i)).toBeInTheDocument();
  });

  it("shows an unrelated failure as a form-level alert without leaking internals", async () => {
    renderForm({ error: new ApiError("boom", 500, "INTERNAL_ERROR", null) });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong on the server. Please try again.");
    expect(alert).not.toHaveTextContent("boom");
  });
});
