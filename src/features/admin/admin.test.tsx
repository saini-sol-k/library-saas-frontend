import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerOnboardingForm } from "@/features/admin/customer-onboarding-form";
import { OnboardingResult } from "@/features/admin/onboarding-result";
import { ApiError } from "@/lib/api-error";
import { NAVIGATION } from "@/lib/navigation";
import { hasAuthority } from "@/lib/jwt";
import type { CustomerOnboardingResponse } from "@/types/api";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const RESULT: CustomerOnboardingResponse = {
  organization: { organizationId: 9, organizationCode: "CUST-A", name: "Customer A" },
  library: {
    libraryId: 14,
    libraryCode: "LIB-A",
    name: "Library A",
    timezone: "Asia/Kolkata",
    seatCount: 100,
    seatsCreated: 100,
    seatRange: "1 - 100",
  },
  user: { userId: 21, username: "admina", email: "admina@customer.example", roleCode: "ORGANIZATION_OWNER" },
  initialCredentials: { username: "admina", temporaryPassword: "Kj7mQp2xRt9wVzAb" },
};

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/organization name/i), "Customer A");
  await user.type(screen.getByLabelText(/library name/i), "Library A");
  await user.type(screen.getByLabelText(/number of seats/i), "100");
  await user.type(screen.getByLabelText(/first name/i), "Asha");
  await user.type(screen.getByLabelText(/login username/i), "admina");
  await user.type(screen.getByLabelText(/^email/i), "admina@customer.example");
}

describe("Platform navigation", () => {
  const platform = NAVIGATION.find((section) => section.label === "Platform");

  it("exposes onboarding only behind the super-admin role", () => {
    expect(platform).toBeDefined();
    expect(platform?.items).toHaveLength(1);
    expect(platform?.items[0].href).toBe("/admin/customers/new");
    expect(platform?.items[0].authority).toBe("ROLE_SUPER_ADMIN");
  });

  it("is visible to the product owner", () => {
    const authorities = ["ROLE_SUPER_ADMIN", "STUDENT_VIEW"];
    expect(hasAuthority(authorities, platform!.items[0].authority!)).toBe(true);
  });

  it("is hidden from a customer administrator holding every tenant permission", () => {
    // ORGANIZATION_OWNER carries all 25 permissions and still must not see it.
    const authorities = [
      "ROLE_ORGANIZATION_OWNER",
      "STUDENT_VIEW",
      "REPORT_VIEW",
      "USER_CREATE",
      "USER_UPDATE",
      "LIBRARY_CREATE",
    ];
    expect(hasAuthority(authorities, platform!.items[0].authority!)).toBe(false);
  });

  it("is hidden from a receptionist", () => {
    expect(hasAuthority(["ROLE_RECEPTIONIST", "STUDENT_VIEW"], "ROLE_SUPER_ADMIN")).toBe(false);
  });
});

describe("CustomerOnboardingForm", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("renders the organization, library and administrator sections", () => {
    wrap(<CustomerOnboardingForm submitting={false} error={null} onSubmit={vi.fn()} />);

    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("Customer administrator")).toBeInTheDocument();
  });

  it("never asks for a password", () => {
    const { container } = wrap(
      <CustomerOnboardingForm submitting={false} error={null} onSubmit={vi.fn()} />,
    );

    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(screen.queryByLabelText(/password/i)).toBeNull();
  });

  it("blocks submission until the required fields are present", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    wrap(<CustomerOnboardingForm submitting={false} error={null} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /create customer/i }));

    expect(await screen.findByText("Organization name is required")).toBeInTheDocument();
    expect(screen.getByText("Library name is required")).toBeInTheDocument();
    expect(screen.getByText("Login username is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    wrap(<CustomerOnboardingForm submitting={false} error={null} onSubmit={onSubmit} />);

    await fillValidForm(user);
    await user.clear(screen.getByLabelText(/^email/i));
    await user.type(screen.getByLabelText(/^email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /create customer/i }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits only the fields that were filled in", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    wrap(<CustomerOnboardingForm submitting={false} error={null} onSubmit={onSubmit} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create customer/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const body = onSubmit.mock.calls[0][0];

    expect(body).toMatchObject({
      organizationName: "Customer A",
      libraryName: "Library A",
      adminUsername: "admina",
      adminEmail: "admina@customer.example",
      adminFirstName: "Asha",
      timezone: "Asia/Kolkata",
    });
    // Blank optional fields are pruned rather than sent as empty strings, and no
    // password field exists to send.
    expect(body).not.toHaveProperty("organizationCode");
    expect(Object.keys(body)).not.toContain("password");
    expect(Object.keys(body)).not.toContain("temporaryPassword");
  });

  it("pins a duplicate-username error to that field", () => {
    wrap(
      <CustomerOnboardingForm
        submitting={false}
        error={new ApiError("Username is already taken", 409, "USERNAME_ALREADY_EXISTS")}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("Username is already taken")).toBeInTheDocument();
  });

  it("shows a duplicate organization code against the code field", () => {
    wrap(
      <CustomerOnboardingForm
        submitting={false}
        error={new ApiError("Organization code already exists", 409, "ORGANIZATION_CODE_ALREADY_EXISTS")}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("Organization code already exists")).toBeInTheDocument();
  });

  it("disables the button while the request is in flight", () => {
    wrap(<CustomerOnboardingForm submitting error={null} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
  });
});

describe("OnboardingResult", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("shows the credentials once, with the warning", () => {
    wrap(<OnboardingResult result={RESULT} onCreateAnother={vi.fn()} />);

    expect(screen.getByTestId("onboarding-username")).toHaveTextContent("admina");
    expect(screen.getByTestId("onboarding-password")).toHaveTextContent("Kj7mQp2xRt9wVzAb");
    expect(screen.getByRole("alert")).toHaveTextContent(/shown once and cannot be retrieved again/i);
  });

  it("shows what was created, including the granted role", () => {
    wrap(<OnboardingResult result={RESULT} onCreateAnother={vi.fn()} />);

    expect(screen.getByText("Customer A")).toBeInTheDocument();
    expect(screen.getByText("Library A")).toBeInTheDocument();
    expect(screen.getByText(/ORGANIZATION_OWNER/)).toBeInTheDocument();
  });

  it("never writes the password into browser storage", () => {
    wrap(<OnboardingResult result={RESULT} onCreateAnother={vi.fn()} />);

    const password = RESULT.initialCredentials.temporaryPassword;
    expect(JSON.stringify(localStorage)).not.toContain(password);
    expect(JSON.stringify(sessionStorage)).not.toContain(password);
    expect(document.cookie).not.toContain(password);
    expect(window.location.href).not.toContain(password);
  });

  it("copies the credentials to the clipboard on request", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    // userEvent.setup() installs its own clipboard stub, so the spy has to be
    // put in place after it or it is immediately replaced.
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    wrap(<OnboardingResult result={RESULT} onCreateAnother={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /copy credentials/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain("Kj7mQp2xRt9wVzAb");
  });

  it("still shows the password when the clipboard is unavailable", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });

    wrap(<OnboardingResult result={RESULT} onCreateAnother={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /copy credentials/i }));

    expect(screen.getByTestId("onboarding-password")).toHaveTextContent("Kj7mQp2xRt9wVzAb");
  });

  it("returns to the form when another customer is requested", async () => {
    const onCreateAnother = vi.fn();
    const user = userEvent.setup();

    wrap(<OnboardingResult result={RESULT} onCreateAnother={onCreateAnother} />);
    await user.click(screen.getByRole("button", { name: /create another customer/i }));

    expect(onCreateAnother).toHaveBeenCalledTimes(1);
  });
});

/**
 * The number of seats at onboarding.
 *
 * The rules here mirror the backend's, which stays authoritative - these only
 * spare the product owner a round trip. What matters is that none of them can be
 * skipped: the form submits with noValidate, so a rejection the schema misses
 * would reach the server rather than being caught by the browser.
 */
describe("CustomerOnboardingForm - number of seats", () => {
  beforeEach(() => vi.clearAllMocks());

  async function fillEverythingExceptSeats(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/organization name/i), "Customer A");
    await user.type(screen.getByLabelText(/library name/i), "Library A");
    await user.type(screen.getByLabelText(/first name/i), "Asha");
    await user.type(screen.getByLabelText(/login username/i), "admina");
    await user.type(screen.getByLabelText(/^email/i), "admina@customer.example");
  }

  /** Types a seat count into an otherwise valid form and submits it. */
  async function submitWithSeats(seats: string, onSubmit: ReturnType<typeof vi.fn>) {
    const user = userEvent.setup();
    wrap(<CustomerOnboardingForm submitting={false} error={null} onSubmit={onSubmit} />);

    await fillEverythingExceptSeats(user);
    if (seats !== "") {
      await user.type(screen.getByLabelText(/number of seats/i), seats);
    }
    await user.click(screen.getByRole("button", { name: /create customer/i }));
    return user;
  }

  it("asks for the number of seats", () => {
    wrap(<CustomerOnboardingForm submitting={false} error={null} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/number of seats/i)).toBeInTheDocument();
  });

  it("requires it", async () => {
    const onSubmit = vi.fn();
    await submitWithSeats("", onSubmit);

    expect(await screen.findByText("Number of seats is required.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects zero", async () => {
    const onSubmit = vi.fn();
    await submitWithSeats("0", onSubmit);

    expect(await screen.findByText("Number of seats must be greater than 0.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a negative number", async () => {
    const onSubmit = vi.fn();
    await submitWithSeats("-5", onSubmit);

    expect(await screen.findByText("Number of seats must be a whole number.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a decimal", async () => {
    const onSubmit = vi.fn();
    await submitWithSeats("1.5", onSubmit);

    expect(await screen.findByText("Number of seats must be a whole number.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a count above the limit", async () => {
    const onSubmit = vi.fn();
    await submitWithSeats("10001", onSubmit);

    expect(await screen.findByText("Number of seats cannot exceed 10000.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a valid count as a number, not a string", async () => {
    const onSubmit = vi.fn();
    await submitWithSeats("100", onSubmit);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].seatCount).toBe(100);
  });

  it("shows a rejected count from the backend against the field", () => {
    wrap(
      <CustomerOnboardingForm
        submitting={false}
        error={new ApiError("Number of seats cannot exceed 10000.", 400, "INVALID_SEAT_COUNT")}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("Number of seats cannot exceed 10000.")).toBeInTheDocument();
  });
});

describe("OnboardingResult - seats", () => {
  it("reports the number of seats, the count created and the range", () => {
    wrap(<OnboardingResult result={RESULT} onCreateAnother={vi.fn()} />);

    expect(screen.getByText("Number of seats")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText(/100 seats created/)).toBeInTheDocument();
    expect(screen.getByText(/1 - 100/)).toBeInTheDocument();
  });
});

describe("CustomerOnboardingForm hint", () => {
  it("names the maximum number of seats the backend will accept", () => {
    wrap(<CustomerOnboardingForm submitting={false} error={null} onSubmit={vi.fn()} />);
    expect(screen.getByText(/up to 10000\./i)).toBeInTheDocument();
  });
});
