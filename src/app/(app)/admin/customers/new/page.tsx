"use client";

import { Lock } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { CustomerOnboardingForm } from "@/features/admin/customer-onboarding-form";
import { OnboardingResult } from "@/features/admin/onboarding-result";
import { useOnboardCustomer } from "@/hooks/use-admin";
import { PageHeader } from "@/layouts/app-shell";
import { useSession } from "@/providers/session-provider";
import type { CustomerOnboardingResponse } from "@/types/api";

/**
 * Product-owner onboarding of a new SaaS customer.
 *
 * The gate below hides the screen from anyone who is not the platform owner, but
 * it is not the security boundary: the backend refuses POST /api/admin/customers
 * for every caller without SUPER_ADMIN, so reaching this URL by typing it
 * achieves nothing. Hiding it here only keeps the product sane for tenant users.
 *
 * The result, including the one-time password, lives in this component's state
 * for as long as it is on screen and is never persisted anywhere.
 */
export default function NewCustomerPage() {
  const { authorities } = useSession();
  const isSuperAdmin = authorities.includes("ROLE_SUPER_ADMIN");

  const [result, setResult] = useState<CustomerOnboardingResponse | null>(null);
  const onboard = useOnboardCustomer();

  if (!isSuperAdmin) {
    return (
      <>
        <PageHeader title="Onboard customer" />
        <Card>
          <EmptyState
            icon={Lock}
            title="Not available to your account"
            description="Only the platform administrator can create customers."
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Onboard customer"
        description="Create a new customer's organization, library and administrator."
      />

      {result ? (
        <OnboardingResult
          result={result}
          onCreateAnother={() => {
            setResult(null);
            onboard.reset();
          }}
        />
      ) : (
        <CustomerOnboardingForm
          submitting={onboard.isPending}
          error={onboard.error}
          onSubmit={(body) => onboard.mutate(body, { onSuccess: setResult })}
        />
      )}
    </>
  );
}
