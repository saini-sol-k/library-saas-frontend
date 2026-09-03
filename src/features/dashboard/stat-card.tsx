import type * as React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";
import { cn } from "@/lib/utils";

type Tone = "brand" | "success" | "danger" | "accent" | "warn";

const TONES: Record<Tone, { wrap: string; icon: string; delta: string }> = {
  brand: { wrap: "bg-brand-50", icon: "text-brand-600", delta: "text-brand-600" },
  success: { wrap: "bg-ok-50", icon: "text-ok-600", delta: "text-ok-600" },
  danger: { wrap: "bg-danger-50", icon: "text-danger-600", delta: "text-danger-600" },
  accent: { wrap: "bg-accent-50", icon: "text-accent-600", delta: "text-accent-600" },
  warn: { wrap: "bg-warn-50", icon: "text-warn-600", delta: "text-warn-600" },
};

/**
 * Metric tile from the reference: tinted icon circle, uppercase label, large
 * value and a small delta line.
 *
 * `unavailable` renders the tile in a muted, explicitly-labelled state instead
 * of showing a zero, so a missing API never reads as real data.
 */
export function StatCard({
  label,
  value,
  suffix,
  delta,
  tone = "brand",
  icon: Icon,
  loading,
  unavailable,
}: {
  label: string;
  value?: string | number;
  suffix?: string;
  delta?: string;
  tone?: Tone;
  icon: React.ElementType;
  loading?: boolean;
  unavailable?: boolean;
}) {
  const palette = TONES[tone];

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
            unavailable ? "bg-linesoft" : palette.wrap,
          )}
        >
          <Icon
            className={cn("h-5 w-5", unavailable ? "text-ink4" : palette.icon)}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink3">{label}</p>

          {loading ? (
            <Skeleton className="mt-2 h-7 w-20" />
          ) : unavailable ? (
            <p className="mt-1 text-sm font-medium text-ink4">Not available</p>
          ) : (
            <p className="mt-0.5 flex items-baseline gap-1">
              <span className="text-[26px] font-bold leading-tight tracking-tight text-ink">
                {value}
              </span>
              {suffix ? <span className="text-sm text-ink3">{suffix}</span> : null}
            </p>
          )}

          {loading ? (
            <Skeleton className="mt-2 h-3 w-24" />
          ) : (
            <p className={cn("mt-0.5 text-[12px]", unavailable ? "text-ink4" : palette.delta)}>
              {unavailable ? "Awaiting backend API" : delta}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
