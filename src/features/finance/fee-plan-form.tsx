"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ApiError, messageFor } from "@/lib/api-error";
import { feePlanSchema, type FeePlanValues } from "@/schemas/finance";
import type { FeePlanRequest, FeePlanResponse } from "@/types/api";

/** Units the seed evidences, plus the obvious siblings the free-text column takes. */
const DURATION_UNITS = ["DAY", "WEEK", "MONTH", "YEAR"] as const;

/**
 * Create or edit a fee plan.
 *
 * The amount is kept as a string from input to request. Parsing it into a
 * number would defeat the exact decimal handling the backend is built around,
 * so it is validated for shape and passed through untouched.
 */
export function FeePlanForm({
  plan,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  plan?: FeePlanResponse;
  submitting: boolean;
  error: unknown;
  onSubmit: (body: FeePlanRequest) => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(plan);

  const form = useForm<FeePlanValues>({
    resolver: zodResolver(feePlanSchema),
    defaultValues: {
      name: plan?.name ?? "",
      description: plan?.description ?? "",
      amount: plan?.amount ?? "",
      durationValue: plan ? String(plan.durationValue) : "1",
      durationUnit: plan?.durationUnit ?? "MONTH",
    },
  });

  const apiError = error instanceof ApiError ? error : null;
  const fieldErrors = apiError?.fieldErrors ?? null;

  const nameError =
    apiError?.errorCode === "FEE_PLAN_NAME_ALREADY_EXISTS" ? messageFor(apiError) : null;
  const amountError =
    apiError?.errorCode === "INVALID_FEE_AMOUNT" ? messageFor(apiError) : null;
  const formLevelError =
    apiError && !nameError && !amountError && !fieldErrors ? messageFor(apiError) : null;

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        const body: FeePlanRequest = {
          name: values.name.trim(),
          amount: values.amount.trim(),
          durationValue: Number(values.durationValue),
          durationUnit: values.durationUnit.trim(),
        };
        const description = values.description?.trim();
        if (description) body.description = description;
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
          label="Name"
          htmlFor="planName"
          required
          error={form.formState.errors.name?.message ?? nameError ?? fieldErrors?.name}
          hint="Unique within this library."
        >
          <Input
            id="planName"
            placeholder="e.g. MONTHLY STANDARD"
            maxLength={100}
            invalid={Boolean(form.formState.errors.name?.message ?? nameError ?? fieldErrors?.name)}
            {...form.register("name")}
          />
        </Field>

        <Field
          label="Description"
          htmlFor="planDescription"
          error={form.formState.errors.description?.message ?? fieldErrors?.description}
        >
          <Input id="planDescription" maxLength={250} {...form.register("description")} />
        </Field>

        <Field
          label="Amount"
          htmlFor="planAmount"
          required
          error={form.formState.errors.amount?.message ?? amountError ?? fieldErrors?.amount}
          hint="In rupees, to two decimal places."
        >
          <Input
            id="planAmount"
            inputMode="decimal"
            placeholder="1500.00"
            invalid={Boolean(
              form.formState.errors.amount?.message ?? amountError ?? fieldErrors?.amount,
            )}
            {...form.register("amount")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Duration"
            htmlFor="planDurationValue"
            required
            error={form.formState.errors.durationValue?.message ?? fieldErrors?.durationValue}
          >
            <Input
              id="planDurationValue"
              inputMode="numeric"
              invalid={Boolean(form.formState.errors.durationValue?.message)}
              {...form.register("durationValue")}
            />
          </Field>

          <Field
            label="Unit"
            htmlFor="planDurationUnit"
            required
            error={form.formState.errors.durationUnit?.message ?? fieldErrors?.durationUnit}
          >
            <Select id="planDurationUnit" {...form.register("durationUnit")}>
              {DURATION_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-linesoft pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {isEdit ? "Save changes" : "Create fee plan"}
        </Button>
      </div>
    </form>
  );
}
