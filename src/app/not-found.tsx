import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
          <FileQuestion className="h-6 w-6 text-brand-600" aria-hidden />
        </div>
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink3">Error 404</p>
        <h1 className="mt-1 text-xl font-semibold text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-ink3">
          That page does not exist, or you may not have access to it.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block">
          <Button>Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
