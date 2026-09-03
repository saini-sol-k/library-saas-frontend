"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ApiError, messageFor } from "@/lib/api-error";
import { fullName } from "@/lib/utils";
import type { MembershipRequest, MembershipResponse, MembershipScope } from "@/types/api";

/**
 * Add a user to an organization or a library.
 *
 * For a library the candidate set is exactly "active members of the parent
 * organization who are not already members", which the organization member list
 * supplies. For an organization there is no candidate list to draw on: the
 * backend has no user-directory endpoint, so the user id is entered directly
 * rather than inventing a picker over data the API does not expose.
 */
export function MemberForm({
  scope,
  candidates,
  existingUserIds,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  scope: MembershipScope;
  candidates?: MembershipResponse[];
  existingUserIds: number[];
  submitting: boolean;
  error: unknown;
  onSubmit: (body: MembershipRequest) => void;
  onCancel: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [touched, setTouched] = useState(false);

  // Only active organization members who are not already in this tenant.
  const selectable = (candidates ?? []).filter(
    (candidate) => candidate.status === "ACTIVE" && !existingUserIds.includes(candidate.userId),
  );
  const usePicker = scope === "libraries" && candidates !== undefined;

  // A conflict or missing user is about the chosen person, so it belongs on
  // that field rather than in a general banner.
  const fieldError =
    error instanceof ApiError &&
    [
      "USER_ALREADY_IN_ORGANIZATION",
      "USER_ALREADY_IN_LIBRARY",
      "USER_NOT_IN_ORGANIZATION",
      "USER_NOT_FOUND",
    ].includes(error.errorCode ?? "")
      ? messageFor(error)
      : null;

  const validationError =
    error instanceof ApiError && error.fieldErrors ? error.fieldErrors.userId : undefined;

  const formLevelError =
    error instanceof ApiError && !fieldError && !error.fieldErrors ? messageFor(error) : null;

  const missing = touched && !userId ? "Choose a user" : undefined;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        const parsed = Number(userId);
        if (!userId || !Number.isFinite(parsed) || parsed <= 0) return;
        onSubmit({ userId: parsed, isPrimary });
      }}
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
        {usePicker ? (
          <Field
            label="User"
            htmlFor="memberUserId"
            required
            error={missing ?? fieldError ?? validationError}
            hint={
              selectable.length === 0
                ? "Every active member of the organization already belongs to this library."
                : "Only members of this library's organization can be added."
            }
          >
            <Select
              id="memberUserId"
              invalid={Boolean(missing ?? fieldError ?? validationError)}
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              disabled={selectable.length === 0}
            >
              <option value="">Select a user</option>
              {selectable.map((candidate) => (
                <option key={candidate.userId} value={String(candidate.userId)}>
                  {fullName(candidate.firstName ?? "", candidate.lastName) || candidate.username}
                  {candidate.username ? ` · ${candidate.username}` : ""}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field
            label="User ID"
            htmlFor="memberUserId"
            required
            error={missing ?? fieldError ?? validationError}
            hint="The backend has no user directory endpoint yet, so the numeric user id is entered directly."
          >
            <Input
              id="memberUserId"
              inputMode="numeric"
              placeholder="e.g. 4"
              invalid={Boolean(missing ?? fieldError ?? validationError)}
              value={userId}
              onChange={(event) => setUserId(event.target.value.replace(/[^0-9]/g, ""))}
            />
          </Field>
        )}

        <label className="flex items-center gap-2 text-sm text-ink2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line accent-brand-600"
            checked={isPrimary}
            onChange={(event) => setIsPrimary(event.target.checked)}
          />
          Make this their primary {scope === "organizations" ? "organization" : "library"}
        </label>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-linesoft pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Add member
        </Button>
      </div>
    </form>
  );
}
