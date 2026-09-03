"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ApiError, messageFor } from "@/lib/api-error";
import { studentDocumentSchema, type StudentDocumentValues } from "@/schemas/student-profile";
import type { StudentDocumentRequest, StudentDocumentResponse } from "@/types/api";

/**
 * Record or edit a document on a student's file.
 *
 * The reference is a path to where the file lives. There is no upload control
 * because the API stores a locator and never receives binary content, and
 * offering a file picker would promise something the backend cannot do.
 */
export function DocumentForm({
  document,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  document?: StudentDocumentResponse;
  submitting: boolean;
  error: unknown;
  onSubmit: (body: StudentDocumentRequest) => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(document);

  const form = useForm<StudentDocumentValues>({
    resolver: zodResolver(studentDocumentSchema),
    defaultValues: {
      documentType: document?.documentType ?? "",
      documentNumber: document?.documentNumber ?? "",
      documentUrl: document?.documentUrl ?? "",
    },
  });

  const apiError = error instanceof ApiError ? error : null;
  const fieldErrors = apiError?.fieldErrors ?? null;
  const formLevelError = apiError && !fieldErrors ? messageFor(apiError) : null;

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        const body: StudentDocumentRequest = { documentType: values.documentType.trim() };
        const number = values.documentNumber?.trim();
        const url = values.documentUrl?.trim();
        if (number) body.documentNumber = number;
        if (url) body.documentUrl = url;
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
          label="Document type"
          htmlFor="documentType"
          required
          error={form.formState.errors.documentType?.message ?? fieldErrors?.documentType}
          hint="For example AADHAAR or PAN."
        >
          <Input
            id="documentType"
            maxLength={50}
            invalid={Boolean(form.formState.errors.documentType?.message)}
            {...form.register("documentType")}
          />
        </Field>

        <Field
          label="Document number"
          htmlFor="documentNumber"
          error={form.formState.errors.documentNumber?.message ?? fieldErrors?.documentNumber}
        >
          <Input id="documentNumber" maxLength={100} {...form.register("documentNumber")} />
        </Field>

        <Field
          label="Reference"
          htmlFor="documentUrl"
          error={form.formState.errors.documentUrl?.message ?? fieldErrors?.documentUrl}
          hint="Path to the stored file. Uploading is not part of this API."
        >
          <Input
            id="documentUrl"
            maxLength={500}
            placeholder="students/1/aadhaar.pdf"
            {...form.register("documentUrl")}
          />
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-linesoft pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {isEdit ? "Save changes" : "Record document"}
        </Button>
      </div>
    </form>
  );
}
