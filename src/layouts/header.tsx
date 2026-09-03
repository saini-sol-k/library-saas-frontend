"use client";

import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { breadcrumbsFor, NAVIGATION } from "@/lib/navigation";
import { cn, initials } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";
import { authService } from "@/services/tenant";

/**
 * Top bar: page title with breadcrumbs, global search, notifications and the
 * profile menu. Search currently routes to the student list, which is the only
 * searchable resource the backend exposes.
 */
export function Header({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { username, libraries, activeLibrary, setActiveLibrary } = useSession();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [term, setTerm] = React.useState("");
  const menuRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const crumbs = breadcrumbsFor(pathname);
  const title =
    NAVIGATION.flatMap((s) => s.items).find(
      (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
    )?.label ?? crumbs[crumbs.length - 1]?.label ?? "A.K. Library";

  // Ctrl/Cmd+K focuses search, as advertised by the chip in the field.
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    function onClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </Button>

        <div className="min-w-0 flex-1 lg:flex-none lg:w-56">
          <h1 className="truncate text-[17px] font-semibold leading-tight text-ink">{title}</h1>
          <nav aria-label="Breadcrumb" className="mt-0.5 hidden sm:block">
            <ol className="flex items-center gap-1.5 text-[12px] text-ink3">
              {crumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 ? <span aria-hidden>›</span> : null}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-brand-600">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-ink2">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Global search */}
        <form
          className="hidden flex-1 justify-center md:flex"
          onSubmit={(event) => {
            event.preventDefault();
            router.push(term.trim() ? `/students?search=${encodeURIComponent(term.trim())}` : "/students");
          }}
        >
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink4" aria-hidden />
            <input
              ref={searchRef}
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search students…"
              aria-label="Search students"
              className="h-10 w-full rounded-lg border border-line bg-page pl-9 pr-16 text-sm text-ink placeholder:text-ink4 focus:bg-white"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-white px-1.5 py-0.5 text-[11px] text-ink4">
              Ctrl + K
            </kbd>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* Library switcher - only meaningful with more than one */}
          {libraries.length > 1 ? (
            <select
              value={activeLibrary?.libraryId ?? ""}
              onChange={(event) => setActiveLibrary(Number(event.target.value))}
              aria-label="Active library"
              className="hidden h-9 rounded-lg border border-line bg-white px-2 text-[13px] text-ink2 sm:block"
            >
              {libraries.map((library) => (
                <option key={library.libraryId} value={library.libraryId}>
                  {library.name}
                </option>
              ))}
            </select>
          ) : null}

          <Link
            href="/notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink2 hover:bg-linesoft"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" aria-hidden />
          </Link>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-linesoft"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-[13px] font-semibold text-white">
                {initials(username)}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[13px] font-medium leading-tight text-ink">{username}</span>
                <span className="block text-[11px] leading-tight text-ink3">Signed in</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-ink3 sm:block" aria-hidden />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className={cn(
                  "absolute right-0 top-full z-40 mt-1 w-52 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg",
                )}
              >
                <div className="border-b border-linesoft px-3 py-2">
                  <p className="truncate text-sm font-medium text-ink">{username}</p>
                  <p className="truncate text-[12px] text-ink3">
                    {activeLibrary?.name ?? "No library assigned"}
                  </p>
                </div>
                <Link
                  href="/settings"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-ink2 hover:bg-linesoft"
                >
                  Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    await authService.logout();
                    router.replace("/login");
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-danger-600 hover:bg-danger-50"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
