"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useFeePlans } from "@/hooks/use-finance";
import { useStudentList } from "@/hooks/use-students";
import { ApiError, messageFor } from "@/lib/api-error";
import { formatMoney, fullName } from "@/lib/utils";
import { studentFeeSchema, type StudentFeeValues } from "@/schemas/finance";
import type { StudentFeeRequest } from "@/types/api";

/**
 * Raise an invoice against a student.
 *
 * The total is deliberately not a field. The backend computes it as amount less
 * discount plus tax, so showing an editable total would invite a figure that
 * disagrees with its own parts. Leaving the amount blank while choosing a plan
 * bills the plan price.
 *
 * Only active plans are offered, because the backend refuses to bill against a
 * retired one.
 */
export function StudentFeeForm({
  libraryId,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  libraryId: number;
  submitting: boolean;
  error: unknown;
  onSubmit: (body: StudentFeeRequest) => void;
  onCancel: () => void;
}) {
  const students = useStudentList({ status: "ACTIVE", page: 0, size: 100 });
  const plans = useFeePlans(libraryId, "ACTIVE");

  const form = useForm<StudentFeeValues>({
    resolver: zodResolver(studentFeeSchema),
    defaultValues: {
      studentId: "",
      feePlanId: "",
      invoiceNumber: "",
      amount: "",
      discountAmount: "",
      taxAmount: "",
      dueDate: "",
    },
  });

  const apiError = error instanceof ApiError ? error : null;
  const fieldErrors = apiError?.fieldErrors ?? null;

  const studentError =
    apiError && ["STUDENT_NOT_FOUND", "STUDENT_NOT_IN_LIBRARY"].includes(apiError.errorCode ?? "")
      ? messageFor(apiError)
      : null;
  const invoiceError =
    apiError?.errorCode === "INVOICE_NUMBER_ALREADY_EXISTS" ? messageFor(apiError) : null;
  const amountError =
    apiError?.errorCode === "INVALID_FEE_AMOUNT" ? messageFor(apiError) : null;
  const planError =
    apiError && ["FEE_PLAN_NOT_FOUND", "FEE_PLAN_INACTIVE"].includes(apiError.errorCode ?? "")
      ? messageFor(apiError)
      : null;
  const formLevelError =
    apiError && !studentError && !invoiceError && !amountError && !planError && !fieldErrors
      ? messageFor(apiError)
      : null;

  const studentRows = students.data?.content ?? [];
  const planRows = plans.data ?? [];

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        const body: StudentFeeRequest = {
          studentId: Number(values.studentId),
          invoiceNumber: values.invoiceNumber.trim(),
          dueDate: values.dueDate,
        };
        if (values.feePlanId) body.feePlanId = Number(values.feePlanId);
        const amount = values.amount?.trim();
        const discount = values.discountAmount?.trim();
        const tax = values.taxAmount?.trim();
        if (amount) body.amount = amount;
        if (discount) body.discountAmount = discount;
        if (tax) body.taxAmount = tax;
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

      <div className="space-y-4">
        <Field
          label="Student"
          htmlFor="feeStudentId"
          required
          error={form.formState.errors.studentId?.message ?? studentError ?? fieldErrors?.studentId}
          hint="Only students of this library can be billed here."
        >
          <Select
            id="feeStudentId"
            invalid={Boolean(form.formState.errors.studentId?.message ?? studentError)}
            disabled={studentRows.length === 0}
            {...form.register("studentId")}
          >
            <option value="">Select a student</option>
            {studentRows.map((student) => (
              <option key={student.id} value={String(student.id)}>
                {fullName(student.firstName, student.lastName) || student.studentCode}
                {student.studentCode ? ` · ${student.studentCode}` : ""}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Fee plan"
          htmlFor="feePlanId"
          error={planError ?? fieldErrors?.feePlanId}
          hint="Optional. Choosing one and leaving the amount blank bills the plan price."
        >
          <Select id="feePlanId" invalid={Boolean(planError)} {...form.register("feePlanId")}>
            <option value="">No plan</option>
            {planRows.map((plan) => (
              <option key={plan.feePlanId} value={String(plan.feePlanId)}>
                {plan.name} · {formatMoney(plan.amount)}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Invoice number"
          htmlFor="feeInvoiceNumber"
          required
          error={
            form.formState.errors.invoiceNumber?.message ??
            invoiceError ??
            fieldErrors?.invoiceNumber
          }
          hint="Unique within this library."
        >
          <Input
            id="feeInvoiceNumber"
            maxLength={50}
            invalid={Boolean(form.formState.errors.invoiceNumber?.message ?? invoiceError)}
            {...form.register("invoiceNumber")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Amount"
            htmlFor="feeAmount"
            error={form.formState.errors.amount?.message ?? amountError ?? fieldErrors?.amount}
          >
            <Input
              id="feeAmount"
              inputMode="decimal"
              placeholder="From plan"
              invalid={Boolean(form.formState.errors.amount?.message ?? amountError)}
              {...form.register("amount")}
            />
          </Field>

          <Field
            label="Discount"
            htmlFor="feeDiscount"
            error={form.formState.errors.discountAmount?.message ?? fieldErrors?.discountAmount}
          >
            <Input
              id="feeDiscount"
              inputMode="decimal"
              placeholder="0.00"
              invalid={Boolean(form.formState.errors.discountAmount?.message)}
              {...form.register("discountAmount")}
            />
          </Field>

          <Field
            label="Tax"
            htmlFor="feeTax"
            error={form.formState.errors.taxAmount?.message ?? fieldErrors?.taxAmount}
          >
            <Input
              id="feeTax"
              inputMode="decimal"
              placeholder="0.00"
              invalid={Boolean(form.formState.errors.taxAmount?.message)}
              {...form.register("taxAmount")}
            />
          </Field>
        </div>
        <p className="-mt-2 text-[13px] text-ink3">
          The total is calculated as amount less discount plus tax.
        </p>

        <Field
          label="Due date"
          htmlFor="feeDueDate"
          required
          error={form.formState.errors.dueDate?.message ?? fieldErrors?.dueDate}
        >
          <Input
            id="feeDueDate"
            type="date"
            invalid={Boolean(form.formState.errors.dueDate?.message)}
            {...form.register("dueDate")}
          />
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-linesoft pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Raise invoice
        </Button>
      </div>
    </form>
  );
}
