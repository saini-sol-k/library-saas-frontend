"use client";

import * as React from "react";
import { Header } from "@/layouts/header";
import { Sidebar } from "@/layouts/sidebar";
import { cn } from "@/lib/utils";

/**
 * Application frame: fixed navy rail on large screens, off-canvas drawer below
 * the lg breakpoint, with the header and scrolling page container beside it.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Close the drawer when the viewport grows past the breakpoint.
  React.useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => media.matches && setDrawerOpen(false);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen bg-page">
      {/* Persistent rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-navy-950/50 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[264px] max-w-[85vw] lg:hidden">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </>
      ) : null}

      <div className={cn("flex min-w-0 flex-1 flex-col lg:pl-[248px]")}>
        <Header onOpenSidebar={() => setDrawerOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
        <footer className="border-t border-line bg-surface px-4 py-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-1 text-[12px] text-ink3 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} A.K. Library Management System. All rights reserved.</p>
            <p>Made for a better learning environment</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** Standard page heading with optional actions. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-ink3">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
