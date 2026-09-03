"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ApiError, messageFor } from "@/lib/api-error";
import {
  emergencyContactSchema,
  type EmergencyContactValues,
} from "@/schemas/student-profile";
import type { EmergencyContactRequest, EmergencyContactResponse } from "@/types/api";

/**
 * Add or edit an emergency contact, with its address inline.
 *
 * There is no address picker and no address id. The backend creates the address
 * with the contact and never accepts one by reference, because the address table
 * is global and an id from here could reach another tenant's row. Offering a
 * chooser would suggest a capability the API deliberately withholds.
 *
 * Leaving every address field blank on an edit keeps the existing address rather
 * than clearing it, which is what the API does with an omitted address.
 */
export function EmergencyContactForm({
  contact,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  contact?: EmergencyContactResponse;
  submitting: boolean;
  error: unknown;
  onSubmit: (body: EmergencyContactRequest) => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(contact);

  const form = useForm<EmergencyContactValues>({
    resolver: zodResolver(emergencyContactSchema),
    defaultValues: {
      firstName: contact?.firstName ?? "",
      lastName: contact?.lastName ?? "",
      relationship: contact?.relationship ?? "",
      mobile: contact?.mobile ?? "",
      email: contact?.email ?? "",
      isPrimary: contact?.isPrimary ?? false,
      addressLine1: contact?.address?.addressLine1 ?? "",
      city: contact?.address?.city ?? "",
      state: contact?.address?.state ?? "",
      postalCode: contact?.address?.postalCode ?? "",
    },
  });

  const apiError = error instanceof ApiError ? error : null;
  const fieldErrors = apiError?.fieldErrors ?? null;
  const formLevelError = apiError && !fieldErrors ? messageFor(apiError) : null;

  const errors = form.formState.errors;

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        const body: EmergencyContactRequest = {
          firstName: values.firstName.trim(),
          isPrimary: Boolean(values.isPrimary),
        };
        const lastName = values.lastName?.trim();
        const relationship = values.relationship?.trim();
        const mobile = values.mobile?.trim();
        const email = values.email?.trim();
        if (lastName) body.lastName = lastName;
        if (relationship) body.relationship = relationship;
        if (mobile) body.mobile = mobile;
        if (email) body.email = email;

        // All four are present together or not at all; the schema enforces that.
        if (values.addressLine1 && values.city && values.state && values.postalCode) {
          body.address = {
            addressLine1: values.addressLine1.trim(),
            city: values.city.trim(),
            state: values.state.trim(),
            postalCode: values.postalCode.trim(),
          };
        }
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="First name"
            htmlFor="contactFirstName"
            required
            error={errors.firstName?.message ?? fieldErrors?.firstName}
          >
            <Input
              id="contactFirstName"
              maxLength={100}
              invalid={Boolean(errors.firstName?.message)}
              {...form.register("firstName")}
            />
          </Field>

          <Field
            label="Last name"
            htmlFor="contactLastName"
            error={errors.lastName?.message ?? fieldErrors?.lastName}
          >
            <Input id="contactLastName" maxLength={100} {...form.register("lastName")} />
          </Field>
        </div>

        <Field
          label="Relationship"
          htmlFor="contactRelationship"
          error={errors.relationship?.message ?? fieldErrors?.relationship}
          hint="For example FATHER, MOTHER or BROTHER."
        >
          <Input id="contactRelationship" maxLength={50} {...form.register("relationship")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Mobile"
            htmlFor="contactMobile"
            error={errors.mobile?.message ?? fieldErrors?.mobile}
          >
            <Input
              id="contactMobile"
              maxLength={30}
              invalid={Boolean(errors.mobile?.message)}
              {...form.register("mobile")}
            />
          </Field>

          <Field
            label="Email"
            htmlFor="contactEmail"
            error={errors.email?.message ?? fieldErrors?.email}
          >
            <Input
              id="contactEmail"
              maxLength={150}
              invalid={Boolean(errors.email?.message)}
              {...form.register("email")}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line accent-brand-600"
            {...form.register("isPrimary")}
          />
          Primary contact for this student
        </label>

        <fieldset className="space-y-4 border-t border-linesoft pt-4">
          <legend className="text-[13px] font-medium text-ink2">Address</legend>
          <p className="text-[13px] text-ink3">
            Optional, but line 1, city, state and postal code go together.
            {isEdit ? " Leave blank to keep the address already on file." : ""}
          </p>

          <Field
            label="Address line 1"
            htmlFor="contactAddressLine1"
            error={errors.addressLine1?.message}
          >
            <Input
              id="contactAddressLine1"
              maxLength={250}
              invalid={Boolean(errors.addressLine1?.message)}
              {...form.register("addressLine1")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" htmlFor="contactCity" error={errors.city?.message}>
              <Input
                id="contactCity"
                maxLength={100}
                invalid={Boolean(errors.city?.message)}
                {...form.register("city")}
              />
            </Field>

            <Field label="State" htmlFor="contactState" error={errors.state?.message}>
              <Input
                id="contactState"
                maxLength={100}
                invalid={Boolean(errors.state?.message)}
                {...form.register("state")}
              />
            </Field>

            <Field
              label="Postal code"
              htmlFor="contactPostalCode"
              error={errors.postalCode?.message}
            >
              <Input
                id="contactPostalCode"
                maxLength={20}
                invalid={Boolean(errors.postalCode?.message)}
                {...form.register("postalCode")}
              />
            </Field>
          </div>
        </fieldset>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-linesoft pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {isEdit ? "Save changes" : "Add contact"}
        </Button>
      </div>
    </form>
  );
}
