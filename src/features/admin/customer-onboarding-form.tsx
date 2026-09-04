"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { ApiError, messageFor } from "@/lib/api-error";
import {
  customerOnboardingSchema,
  TIMEZONES,
  type CustomerOnboardingValues,
} from "@/schemas/admin";
import { pruneEmpty } from "@/schemas/student";
import type { CustomerOnboardingRequest } from "@/types/api";

/**
 * The product owner's form for onboarding a new customer.
 *
 * It collects only what the schema actually requires. There is no password
 * input: the backend generates the initial password, so nothing sensitive is
 * ever typed here, held in form state, or replayed by a browser autofill.
 *
 * Backend validation is authoritative. A VALIDATION_ERROR response carries
 * { field: message } in `data`, and those messages are pinned to the matching
 * input; USERNAME_ALREADY_EXISTS and EMAIL_ALREADY_EXISTS are attached to the
 * field they concern rather than shown as a general failure.
 */
export function CustomerOnboardingForm({
  submitting,
  error,
  onSubmit,
}: {
  submitting: boolean;
  error: unknown;
  onSubmit: (body: CustomerOnboardingRequest) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerOnboardingValues>({
    resolver: zodResolver(customerOnboardingSchema),
    defaultValues: { timezone: "Asia/Kolkata" },
  });

  const apiError = error instanceof ApiError ? error : null;
  const fieldErrors = (apiError?.fieldErrors ?? {}) as Record<string, string>;

  /** Business codes shown against the field they concern rather than as a banner. */
  const PINNED_CODES = [
    "USERNAME_ALREADY_EXISTS",
    "EMAIL_ALREADY_EXISTS",
    "ORGANIZATION_CODE_ALREADY_EXISTS",
    "INVALID_TIMEZONE",
  ];

  const codeErrorFor = (code: string) => (apiError?.errorCode === code ? apiError.message : undefined);

  const errorFor = (name: keyof CustomerOnboardingValues) =>
    errors[name]?.message ?? fieldErrors[name];

  // A code that is already pinned to an input must not also appear as a banner,
  // or the same sentence shows up twice on the page.
  const showBanner =
    apiError !== null
    && Object.keys(fieldErrors).length === 0
    && !PINNED_CODES.includes(apiError.errorCode ?? "");

  return (
    // noValidate, as every other form in this app does: zod owns validation, and
    // the browser's native constraint bubbles would otherwise pre-empt the
    // submit handler and the app's own messages would never be shown.
    <form
      onSubmit={handleSubmit((values) => onSubmit(pruneEmpty(values)))}
      className="space-y-4"
      noValidate
    >
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="Organization name" htmlFor="organizationName" required
                 error={errorFor("organizationName")}>
            <Input id="organizationName" {...register("organizationName")} />
          </Field>
          <Field
            label="Organization code"
            htmlFor="organizationCode"
            hint="Optional. Derived from the name when left blank."
            error={errorFor("organizationCode") ?? codeErrorFor("ORGANIZATION_CODE_ALREADY_EXISTS")}
          >
            <Input id="organizationCode" {...register("organizationCode")} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Library</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="Library name" htmlFor="libraryName" required error={errorFor("libraryName")}>
            <Input id="libraryName" {...register("libraryName")} />
          </Field>
          <Field
            label="Library code"
            htmlFor="libraryCode"
            hint="Optional. Derived from the name when left blank."
            error={errorFor("libraryCode")}
          >
            <Input id="libraryCode" {...register("libraryCode")} />
          </Field>
          <Field
            label="Timezone"
            htmlFor="timezone"
            hint="Drives every daily figure this library reports."
            error={errorFor("timezone") ?? codeErrorFor("INVALID_TIMEZONE")}
          >
            <Select id="timezone" {...register("timezone")}>
              {TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer administrator</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="First name" htmlFor="adminFirstName" required
                 error={errorFor("adminFirstName")}>
            <Input id="adminFirstName" {...register("adminFirstName")} />
          </Field>
          <Field label="Last name" htmlFor="adminLastName" error={errorFor("adminLastName")}>
            <Input id="adminLastName" {...register("adminLastName")} />
          </Field>
          <Field
            label="Login username"
            htmlFor="adminUsername"
            required
            error={errorFor("adminUsername") ?? codeErrorFor("USERNAME_ALREADY_EXISTS")}
          >
            <Input id="adminUsername" autoComplete="off" {...register("adminUsername")} />
          </Field>
          <Field
            label="Email"
            htmlFor="adminEmail"
            required
            error={errorFor("adminEmail") ?? codeErrorFor("EMAIL_ALREADY_EXISTS")}
          >
            <Input id="adminEmail" type="email" autoComplete="off" {...register("adminEmail")} />
          </Field>
          <Field label="Mobile" htmlFor="adminMobile" error={errorFor("adminMobile")}>
            <Input id="adminMobile" {...register("adminMobile")} />
          </Field>
        </div>
        <p className="px-5 pb-5 text-[13px] text-ink3">
          The administrator is created with the Organization Owner role and can manage only this
          customer&rsquo;s own organization and library. An initial password is generated by the
          server and shown once after creation.
        </p>
      </Card>

      {showBanner ? (
        <p className="text-[13px] text-danger-600" role="alert">
          {messageFor(error)}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create customer"}
        </Button>
      </div>
    </form>
  );
}
