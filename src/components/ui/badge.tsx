import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-linesoft text-ink2",
        brand: "bg-brand-50 text-brand-700",
        success: "bg-ok-50 text-ok-700",
        danger: "bg-danger-50 text-danger-700",
        warn: "bg-warn-50 text-warn-700",
        accent: "bg-accent-50 text-accent-600",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Maps the backend's status strings onto the reference colour language. */
export function StatusBadge({ status }: { status: string | null | undefined }) {
  const value = (status ?? "").toUpperCase();
  const tone =
    value === "ACTIVE"
      ? "success"
      : value === "INACTIVE"
        ? "neutral"
        : value === "SUSPENDED"
          ? "danger"
          : value === "PENDING"
            ? "warn"
            : "neutral";
  return <Badge tone={tone}>{value || "UNKNOWN"}</Badge>;
}
