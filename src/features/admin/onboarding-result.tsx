"use client";

import { Check, Copy, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { CustomerOnboardingResponse } from "@/types/api";

/**
 * The one and only display of a new customer's initial password.
 *
 * This value is held in the calling component's React state and nowhere else.
 * It is deliberately not written to localStorage, sessionStorage, a cookie, the
 * URL, or the query cache, and no request can fetch it again: the backend stores
 * only a BCrypt hash and offers no endpoint that returns it. Navigating away
 * loses it permanently, which is why the warning below is prominent rather than
 * decorative.
 */
export function OnboardingResult({
  result,
  onCreateAnother,
}: {
  result: CustomerOnboardingResponse;
  onCreateAnother: () => void;
}) {
  const [copied, setCopied] = useState(false);

  // Clipboard access can be refused or unavailable outside a secure context, so
  // the button never becomes the only way to read the password - it is on screen.
  const copyCredentials = async () => {
    try {
      await navigator.clipboard.writeText(
        `Username: ${result.initialCredentials.username}\n` +
          `Temporary password: ${result.initialCredentials.temporaryPassword}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Customer created</CardTitle>
        </CardHeader>
        <dl className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          <div>
            <dt className="text-[13px] text-ink3">Organization</dt>
            <dd className="font-medium text-ink">{result.organization.name}</dd>
            <p className="font-mono text-[12px] text-ink3">{result.organization.organizationCode}</p>
          </div>
          <div>
            <dt className="text-[13px] text-ink3">Library</dt>
            <dd className="font-medium text-ink">{result.library.name}</dd>
            <p className="font-mono text-[12px] text-ink3">
              {result.library.libraryCode} · {result.library.timezone}
            </p>
          </div>
          <div>
            <dt className="text-[13px] text-ink3">Administrator</dt>
            <dd className="font-medium text-ink">{result.user.email}</dd>
            <p className="text-[12px] text-ink3">Role: {result.user.roleCode}</p>
          </div>
          {/*
            Seats are reported back from the response rather than echoed from the
            form: the backend generates the numbers, so what it says it created is
            the only trustworthy account of what exists.
          */}
          <div>
            <dt className="text-[13px] text-ink3">Number of seats</dt>
            <dd className="font-medium text-ink">{result.library.seatCount}</dd>
            <p className="text-[12px] text-ink3">
              {result.library.seatsCreated} seats created
              {result.library.seatRange ? ` · ${result.library.seatRange}` : null}
            </p>
          </div>
        </dl>
      </Card>

      <Card className="border-warn-500">
        <CardHeader
          action={
            <Button type="button" variant="secondary" onClick={copyCredentials}>
              {copied ? (
                <>
                  <Check className="mr-1.5 h-4 w-4" aria-hidden /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" aria-hidden /> Copy credentials
                </>
              )}
            </Button>
          }
        >
          <CardTitle>Sign-in credentials</CardTitle>
        </CardHeader>

        <div className="p-5">
          <p
            className="mb-4 flex items-start gap-2 rounded-lg border border-warn-500 bg-warn-50 px-3 py-2 text-[13px] text-warn-700"
            role="alert"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Save these credentials now. The temporary password is shown once and cannot be
              retrieved again. Share it with the customer over a secure channel.
            </span>
          </p>

          <dl className="space-y-3">
            <div>
              <dt className="text-[13px] text-ink3">Username</dt>
              <dd className="font-mono text-[15px] text-ink" data-testid="onboarding-username">
                {result.initialCredentials.username}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink3">Temporary password</dt>
              <dd
                className="select-all font-mono text-[15px] text-ink"
                data-testid="onboarding-password"
              >
                {result.initialCredentials.temporaryPassword}
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={onCreateAnother}>
          Create another customer
        </Button>
      </div>
    </div>
  );
}
