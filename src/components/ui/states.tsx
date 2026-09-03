import { AlertCircle, Inbox, Loader2, PlugZap } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { API_GAPS, type ApiGapKey } from "@/lib/api-gaps";
import { cn } from "@/lib/utils";

/** Shimmer block used while data is in flight. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-linesoft", className)} />;
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink3">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-linesoft">
        <Icon className="h-5 w-5 text-ink4" aria-hidden />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-ink3">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Could not load this",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-danger-50">
        <AlertCircle className="h-5 w-5 text-danger-600" aria-hidden />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-ink3">{description}</p> : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Shown wherever the UI is ready but the backend endpoint does not exist yet.
 * It names the missing endpoint rather than pretending with placeholder data,
 * so nobody mistakes an unbuilt feature for a broken one.
 */
export function ApiGapNotice({ gap, className }: { gap: ApiGapKey; className?: string }) {
  const detail = API_GAPS[gap];
  return (
    <Card className={cn("border-dashed bg-white", className)}>
      <div className="flex flex-col items-start gap-3 p-5 sm:flex-row">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warn-50">
          <PlugZap className="h-4.5 w-4.5 text-warn-600" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Backend API not available yet</p>
          <p className="mt-1 text-sm text-ink2">{detail.capability}</p>
          <dl className="mt-3 space-y-1 text-[13px]">
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-ink3">Needs</dt>
              <dd className="font-mono text-ink">{detail.suggestedEndpoint}</dd>
            </div>
            {"tables" in detail && detail.tables ? (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-ink3">Tables present</dt>
                <dd className="font-mono text-ink2">{detail.tables.join(", ")}</dd>
              </div>
            ) : (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-ink3">Status</dt>
                <dd className="text-ink2">Not modelled in the database yet</dd>
              </div>
            )}
          </dl>
          {"note" in detail && detail.note ? (
            <p className="mt-2 text-[13px] text-ink3">{detail.note}</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
