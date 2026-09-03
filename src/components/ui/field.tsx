"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border bg-white px-3 text-sm text-ink placeholder:text-ink4 transition-colors disabled:bg-linesoft disabled:text-ink3";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(control, "h-10", invalid ? "border-danger-500" : "border-line", className)}
    {...props}
  />
));
Input.displayName = "Input";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <select
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(control, "h-10", invalid ? "border-danger-500" : "border-line", className)}
    {...props}
  />
));
Select.displayName = "Select";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(control, "py-2", invalid ? "border-danger-500" : "border-line", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("mb-1.5 block text-sm font-medium text-ink2", className)} {...props}>
      {children}
      {required ? <span className="ml-0.5 text-danger-600">*</span> : null}
    </label>
  );
}

/** Label + control + error message, so forms stay consistent everywhere. */
export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {error ? (
        <p className="mt-1 text-[13px] text-danger-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[13px] text-ink3">{hint}</p>
      ) : null}
    </div>
  );
}
