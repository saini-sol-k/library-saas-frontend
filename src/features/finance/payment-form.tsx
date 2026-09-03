"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ApiError, messageFor } from "@/lib/api-error";
import { formatMoney } from "@/lib/utils";
import { PAYMENT_METHODS, paymentSchema, type PaymentValues } from "@/schemas/finance";
import type { PaymentRequest, StudentFeeResponse } from "@/types/api";

/**
 * Record money received against one invoice.
 *
 * The invoice supplies the student and the library, so neither appears here and
 * neither can be redirected. The outstanding balance is shown because the
 * backend refuses anything above it: this schema has no way to hold an
 * overpayment, so it is better to state the limit than to let the user discover
 * it by being rejected.
 *
 * The amount stays a string throughout. It is validated for shape and sent as
 * typed, so the exact decimal the backend expects is what it receives.
 */
export function PaymentForm({
  fee,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  fee: StudentFeeResponse;
  submitting: boolean;
  error: unknown;
  onSubmit: (body: PaymentRequest) => void;
  onCancel: () => void;
}) {
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      receiptNumber: "",
      // Settling in full is the common case, so it is offered by default.
      amount: fee.balanceAmount,
      paymentMethod: "CASH",
      transactionReference: "",
    },
  });

  const apiError = error instanceof ApiError ? error : null;
  const fieldErrors = apiError?.fieldErrors ?? null;

  const receiptError =
    apiError?.errorCode === "RECEIPT_NUMBER_ALREADY_EXISTS" ? messageFor(apiError) : null;
  const amountError =
    apiError &&
    ["PAYMENT_EXCEEDS_BALANCE", "INVALID_PAYMENT_AMOUNT", "STUDENT_FEE_ALREADY_PAID"].includes(
      apiError.errorCode ?? "",
    )
      ? messageFor(apiError)
      : null;
  const formLevelError =
    apiError && !receiptError && !amountError && !fieldErrors ? messageFor(apiError) : null;

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        const body: PaymentRequest = {
          receiptNumber: values.receiptNumber.trim(),
          amount: values.amount.trim(),
          paymentMethod: values.paymentMethod,
        };
        const reference = values.transactionReference?.trim();
        if (reference) body.transactionReference = reference;
        onSubmit(body);
      })}
      noValidate
    >
      {formLevelError ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-sm text-danger-700"
        >
          {formLevelError}
        </div>
      ) : null}

      <dl className="mb-4 rounded-lg border border-linesoft bg-linesoft/40 px-3 py-2.5 text-sm">
        <div className="flex justify-between py-0.5">
          <dt className="text-ink3">Invoice</dt>
          <dd className="font-mono text-ink">{fee.invoiceNumber}</dd>
        </div>
        <div className="flex justify-between py-0.5">
          <dt className="text-ink3">Student</dt>
          <dd className="text-ink">{fee.studentName ?? `Student ${fee.studentId}`}</dd>
        </div>
        <div className="flex justify-between py-0.5">
          <dt className="text-ink3">Total</dt>
          <dd className="text-ink">{formatMoney(fee.totalAmount)}</dd>
        </div>
        <div className="flex justify-between py-0.5">
          <dt className="text-ink3">Already paid</dt>
          <dd className="text-ink">{formatMoney(fee.paidAmount)}</dd>
        </div>
        <div className="flex justify-between border-t border-linesoft pt-1.5 font-medium">
          <dt className="text-ink2">Outstanding</dt>
          <dd className="text-ink">{formatMoney(fee.balanceAmount)}</dd>
        </div>
      </dl>

      <div className="space-y-4">
        <Field
          label="Receipt number"
          htmlFor="paymentReceipt"
          required
          error={
            form.formState.errors.receiptNumber?.message ??
            receiptError ??
            fieldErrors?.receiptNumber
          }
          hint="Unique within this library."
        >
          <Input
            id="paymentReceipt"
            maxLength={50}
            invalid={Boolean(form.formState.errors.receiptNumber?.message ?? receiptError)}
            {...form.register("receiptNumber")}
          />
        </Field>

        <Field
          label="Amount"
          htmlFor="paymentAmount"
          required
          error={form.formState.errors.amount?.message ?? amountError ?? fieldErrors?.amount}
          hint={`Cannot exceed the outstanding ${formatMoney(fee.balanceAmount)}.`}
        >
          <Input
            id="paymentAmount"
            inputMode="decimal"
            invalid={Boolean(form.formState.errors.amount?.message ?? amountError)}
            {...form.register("amount")}
          />
        </Field>

        <Field
          label="Method"
          htmlFor="paymentMethod"
          required
          error={form.formState.errors.paymentMethod?.message ?? fieldErrors?.paymentMethod}
        >
          <Select id="paymentMethod" {...form.register("paymentMethod")}>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method.replace("_", " ")}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Transaction reference"
          htmlFor="paymentReference"
          error={form.formState.errors.transactionReference?.message}
          hint="Optional, for card, UPI or bank transfers."
        >
          <Input id="paymentReference" maxLength={150} {...form.register("transactionReference")} />
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-linesoft pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Record payment
        </Button>
      </div>
    </form>
  );
}
