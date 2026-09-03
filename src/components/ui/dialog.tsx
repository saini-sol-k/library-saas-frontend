"use client";

import { X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Modal built on the native <dialog> element, so focus trapping, Escape and the
 * top layer come from the platform instead of a hand-rolled implementation.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) dismisses.
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] max-w-lg rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-navy-950/40",
        className,
      )}
      aria-labelledby="dialog-title"
    >
      <div className="flex items-start justify-between gap-4 border-b border-linesoft px-5 py-4">
        <div className="min-w-0">
          <h2 id="dialog-title" className="text-base font-semibold text-ink">
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-sm text-ink3">{description}</p> : null}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div className="px-5 py-4">{children}</div>

      {footer ? (
        <div className="flex justify-end gap-2 border-t border-linesoft px-5 py-3">{footer}</div>
      ) : null}
    </dialog>
  );
}

/** Destructive confirmation, used for student deletion. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink2">This cannot be undone.</p>
    </Dialog>
  );
}
