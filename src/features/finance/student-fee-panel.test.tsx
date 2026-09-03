import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudentFeePanel } from "@/features/finance/student-fee-panel";
import type { StudentFeeResponse } from "@/types/api";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function invoice(overrides: Partial<StudentFeeResponse> = {}): StudentFeeResponse {
  return {
    studentFeeId: 2,
    libraryId: 1,
    studentId: 2,
    studentCode: "STU002",
    studentName: "Priya Verma",
    membershipId: null,
    feePlanId: 1,
    feePlanName: "MONTHLY STANDARD",
    invoiceNumber: "INV002",
    amount: "1500.00",
    discountAmount: "100.00",
    taxAmount: "0.00",
    totalAmount: "1400.00",
    paidAmount: "700.00",
    balanceAmount: "700.00",
    dueDate: "2026-09-05",
    status: "PARTIALLY_PAID",
    overdue: false,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const SETTLED = invoice({
  studentFeeId: 1,
  studentId: 1,
  studentCode: "STU001",
  studentName: "Rahul Sharma",
  invoiceNumber: "INV001",
  amount: "1500.00",
  discountAmount: "0.00",
  totalAmount: "1500.00",
  paidAmount: "1500.00",
  balanceAmount: "0.00",
  status: "PAID",
});

const STUDENT_PAGE = {
  content: [
    { id: 3, libraryId: 1, studentCode: "STU003", firstName: "Suresh", lastName: "Kumar", mobile: null, status: "ACTIVE" },
  ],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 100,
};

const PLANS = [
  {
    feePlanId: 1,
    libraryId: 1,
    name: "MONTHLY STANDARD",
    description: null,
    amount: "1500.00",
    durationValue: 1,
    durationUnit: "MONTH",
    status: "ACTIVE",
    createdAt: null,
    updatedAt: null,
  },
];

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}
const ok = (data: unknown) => reply(200, { success: true, message: "ok", data });

function routeFetch(
  overrides: Record<string, () => Response> = {},
  rows: StudentFeeResponse[] = [invoice(), SETTLED],
) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const path = (url as string).split("?")[0];
    const key = `${init?.method ?? "GET"} ${path}`;
    if (overrides[key]) return overrides[key]();
    if (key === "GET /api/backend/libraries/1/student-fees") return ok(rows);
    if (key === "GET /api/backend/libraries/1/fee-plans") return ok(PLANS);
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
      <StudentFeePanel libraryId={1} title="Invoices" canBill canTakePayment {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("StudentFeePanel rendering", () => {
  it("shows the total, what is paid and what is outstanding", async () => {
    renderPanel(routeFetch());

    expect(await screen.findByText("INV002")).toBeInTheDocument();
    const row = screen.getByText("INV002").closest("tr") as HTMLElement;
    // Amounts are rendered from the backend's decimal strings, never recomputed.
    expect(within(row).getByText("₹1,400.00")).toBeInTheDocument();
    // Paid and outstanding both happen to be 700.00 on this invoice, so the
    // assertion counts them rather than assuming a single match.
    expect(within(row).getAllByText("₹700.00")).toHaveLength(2);
    expect(within(row).getByText("PARTIALLY_PAID")).toBeInTheDocument();
  });

  it("offers Take payment only while a balance remains", async () => {
    renderPanel(routeFetch());

    await screen.findByText("INV002");
    const open = screen.getByText("INV002").closest("tr") as HTMLElement;
    expect(within(open).getByRole("button", { name: /take payment/i })).toBeInTheDocument();

    const settled = screen.getByText("INV001").closest("tr") as HTMLElement;
    expect(within(settled).queryByRole("button", { name: /take payment/i })).not.toBeInTheDocument();
    expect(within(settled).getByText("Settled")).toBeInTheDocument();
  });

  it("flags an overdue invoice", async () => {
    renderPanel(routeFetch({}, [invoice({ overdue: true })]));
    expect(await screen.findByText(/overdue/i)).toBeInTheDocument();
  });

  it("shows an empty state when nothing has been billed", async () => {
    renderPanel(routeFetch({}, []));
    expect(await screen.findByText(/no invoices/i)).toBeInTheDocument();
  });

  it("surfaces a load failure with a retry", async () => {
    renderPanel(
      routeFetch({
        "GET /api/backend/libraries/1/student-fees": () =>
          reply(403, { success: false, message: "Denied", data: null, errorCode: "FORBIDDEN" }),
      }),
    );

    expect(await screen.findByText(/could not load invoices/i)).toBeInTheDocument();
    expect(screen.getByText("You do not have permission to do that.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("hides billing controls without FEE_PLAN_CREATE but keeps payment", async () => {
    renderPanel(routeFetch(), { canBill: false });

    await screen.findByText("INV002");
    expect(screen.queryByRole("button", { name: /raise invoice/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /take payment/i }).length).toBeGreaterThan(0);
  });

  it("hides payment controls without PAYMENT_CREATE", async () => {
    renderPanel(routeFetch(), { canTakePayment: false });

    await screen.findByText("INV002");
    expect(screen.queryByRole("button", { name: /take payment/i })).not.toBeInTheDocument();
  });
});

describe("StudentFeePanel raising an invoice", () => {
  it("POSTs the parts and never a total", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/libraries/1/student-fees": () =>
        reply(201, { success: true, message: "ok", data: invoice({ studentFeeId: 9 }) }),
    });
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /raise invoice/i }));
    const dialog = await screen.findByRole("dialog");

    await user.selectOptions(within(dialog).getByLabelText(/^student/i), "3");
    await user.type(within(dialog).getByLabelText(/invoice number/i), "INV900");
    await user.type(within(dialog).getByLabelText(/^amount/i), "1000.00");
    await user.type(within(dialog).getByLabelText(/^discount/i), "150.50");
    await user.type(within(dialog).getByLabelText(/due date/i), "2026-12-31");
    await user.click(within(dialog).getByRole("button", { name: /raise invoice/i }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "POST");
      const body = JSON.parse((post?.[1] as RequestInit).body as string);
      expect(body).toMatchObject({
        studentId: 3,
        invoiceNumber: "INV900",
        amount: "1000.00",
        discountAmount: "150.50",
      });
      // The total is the backend's to compute.
      expect(body.totalAmount).toBeUndefined();
      // Amounts travel as strings so no float rounding can occur.
      expect(typeof body.amount).toBe("string");
    });
  });

  it("rejects a malformed amount before sending", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch();
    renderPanel(fetchMock);

    await user.click(await screen.findByRole("button", { name: /raise invoice/i }));
    const dialog = await screen.findByRole("dialog");

    await user.selectOptions(within(dialog).getByLabelText(/^student/i), "3");
    await user.type(within(dialog).getByLabelText(/invoice number/i), "INV901");
    await user.type(within(dialog).getByLabelText(/^amount/i), "12.345");
    await user.type(within(dialog).getByLabelText(/due date/i), "2026-12-31");
    await user.click(within(dialog).getByRole("button", { name: /raise invoice/i }));

    expect(await within(dialog).findByText(/enter an amount like/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit)?.method === "POST")).toBe(false);
  });

  it("explains a duplicate invoice number on the field", async () => {
    const user = userEvent.setup();
    renderPanel(
      routeFetch({
        "POST /api/backend/libraries/1/student-fees": () =>
          reply(409, {
            success: false,
            message: "Taken",
            data: null,
            errorCode: "INVOICE_NUMBER_ALREADY_EXISTS",
          }),
      }),
    );

    await user.click(await screen.findByRole("button", { name: /raise invoice/i }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/^student/i), "3");
    await user.type(within(dialog).getByLabelText(/invoice number/i), "INV001");
    await user.type(within(dialog).getByLabelText(/^amount/i), "100.00");
    await user.type(within(dialog).getByLabelText(/due date/i), "2026-12-31");
    await user.click(within(dialog).getByRole("button", { name: /raise invoice/i }));

    expect(await within(dialog).findByText(/invoice number is already used/i)).toBeInTheDocument();
  });
});

describe("StudentFeePanel taking a payment", () => {
  it("shows the outstanding balance and defaults to settling it", async () => {
    const user = userEvent.setup();
    renderPanel(routeFetch());

    await user.click((await screen.findAllByRole("button", { name: /take payment/i }))[0]);
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByText("INV002")).toBeInTheDocument();
    expect(within(dialog).getAllByText("₹700.00").length).toBeGreaterThan(0);
    // Settling in full is the common case.
    expect(within(dialog).getByLabelText(/^amount/i)).toHaveValue("700.00");
  });

  it("POSTs the payment against the invoice, with the amount as a string", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/student-fees/2/payments": () =>
        reply(201, { success: true, message: "ok", data: { paymentId: 9 } }),
    });
    renderPanel(fetchMock);

    await user.click((await screen.findAllByRole("button", { name: /take payment/i }))[0]);
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/receipt number/i), "REC900");
    await user.click(within(dialog).getByRole("button", { name: /record payment/i }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) => (c[1] as RequestInit)?.method === "POST");
      expect(post?.[0]).toBe("/api/backend/student-fees/2/payments");
      const body = JSON.parse((post?.[1] as RequestInit).body as string);
      expect(body).toMatchObject({ receiptNumber: "REC900", amount: "700.00", paymentMethod: "CASH" });
      expect(typeof body.amount).toBe("string");
      // The student and library are the invoice's, never sent from here.
      expect(body.studentId).toBeUndefined();
      expect(body.libraryId).toBeUndefined();
    });
  });

  it("explains an overpayment next to the amount", async () => {
    const user = userEvent.setup();
    renderPanel(
      routeFetch({
        "POST /api/backend/student-fees/2/payments": () =>
          reply(400, {
            success: false,
            message: "Too much",
            data: null,
            errorCode: "PAYMENT_EXCEEDS_BALANCE",
          }),
      }),
    );

    await user.click((await screen.findAllByRole("button", { name: /take payment/i }))[0]);
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/receipt number/i), "REC901");
    await user.click(within(dialog).getByRole("button", { name: /record payment/i }));

    expect(
      await within(dialog).findByText(/more than the outstanding balance/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("explains a duplicate receipt number on its field", async () => {
    const user = userEvent.setup();
    renderPanel(
      routeFetch({
        "POST /api/backend/student-fees/2/payments": () =>
          reply(409, {
            success: false,
            message: "Used",
            data: null,
            errorCode: "RECEIPT_NUMBER_ALREADY_EXISTS",
          }),
      }),
    );

    await user.click((await screen.findAllByRole("button", { name: /take payment/i }))[0]);
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/receipt number/i), "REC001");
    await user.click(within(dialog).getByRole("button", { name: /record payment/i }));

    expect(await within(dialog).findByText(/receipt number has already been used/i)).toBeInTheDocument();
  });

  it("blocks a zero payment before it reaches the server", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch();
    renderPanel(fetchMock);

    await user.click((await screen.findAllByRole("button", { name: /take payment/i }))[0]);
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/receipt number/i), "REC902");
    await user.clear(within(dialog).getByLabelText(/^amount/i));
    await user.type(within(dialog).getByLabelText(/^amount/i), "0");
    await user.click(within(dialog).getByRole("button", { name: /record payment/i }));

    expect(await within(dialog).findByText(/greater than zero/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit)?.method === "POST")).toBe(false);
  });

  it("never issues a DELETE against a payment", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "POST /api/backend/student-fees/2/payments": () =>
        reply(201, { success: true, message: "ok", data: { paymentId: 9 } }),
    });
    renderPanel(fetchMock);

    await user.click((await screen.findAllByRole("button", { name: /take payment/i }))[0]);
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/receipt number/i), "REC903");
    await user.click(within(dialog).getByRole("button", { name: /record payment/i }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit)?.method === "POST")).toBe(true),
    );
    expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit)?.method === "DELETE")).toBe(false);
  });
});
