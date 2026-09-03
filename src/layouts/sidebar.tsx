"use client";

import { BookOpen, LogOut, MapPin } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { NAVIGATION } from "@/lib/navigation";
import { cn, initials } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";
import { authService } from "@/services/tenant";

/**
 * Deep navy rail from the reference: brand lock-up, grouped nav with a blue
 * filled pill for the active route, then the signed-in user and the library
 * they are currently working in.
 */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { username, can, activeLibrary, activeOrganization } = useSession();
  const [signingOut, setSigningOut] = React.useState(false);

  async function signOut() {
    setSigningOut(true);
    await authService.logout();
    router.replace("/login");
  }

  return (
    <div className="flex h-full w-full flex-col bg-navy-900 text-white">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <BookOpen className="h-5 w-5 text-white" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[17px] font-bold leading-tight tracking-tight">A.K. LIBRARY</p>
          <p className="truncate text-[11px] text-white/55">Study • Focus • Achieve</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="scroll-slim flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
        {NAVIGATION.map((section) => {
          const visible = section.items.filter((item) => !item.authority || can(item.authority));
          if (visible.length === 0) return null;

          return (
            <div key={section.label} className="mb-5">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
                {section.label}
              </p>
              <ul className="space-y-1">
                {visible.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                          active
                            ? "bg-brand-600 font-medium text-white"
                            : "text-white/70 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Signed-in user */}
      <div className="mx-3 mb-3 rounded-xl bg-white/[0.06] p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-[13px] font-semibold">
            {initials(username)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{username}</p>
            <p className="flex items-center gap-1.5 text-[11px] text-white/55">
              <span className="h-1.5 w-1.5 rounded-full bg-ok-500" aria-hidden />
              Online
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="mt-3 flex w-full items-center gap-3 rounded-lg px-1 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden />
          {signingOut ? "Signing out…" : "Logout"}
        </button>
      </div>

      {/* Tenant footer - real data from the user's own memberships */}
      <div className="flex items-start gap-2 border-t border-white/10 px-5 py-4 text-[12px] text-white/55">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-white/75">{activeLibrary?.name ?? "No library assigned"}</p>
          <p className="truncate">{activeOrganization?.name ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}
