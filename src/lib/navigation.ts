import {
  BarChart3,
  Bell,
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  LogIn,
  Settings,
  Sofa,
  UserCheck,
  Users,
} from "lucide-react";
import type { ApiGapKey } from "@/lib/api-gaps";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Backend permission the item needs. Undefined means always visible. */
  authority?: string;
  /** Set when the screen has no backend yet, so the UI can mark it. */
  gap?: ApiGapKey;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAVIGATION: NavSection[] = [
  {
    label: "Main Menu",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/students", label: "Students", icon: Users, authority: "STUDENT_VIEW" },
      { href: "/memberships", label: "Memberships", icon: UserCheck, authority: "STUDENT_VIEW" },
      { href: "/seats", label: "Seats", icon: Sofa, authority: "SEAT_VIEW" },
      { href: "/check-in-out", label: "Check-In / Check-Out", icon: LogIn, authority: "ATTENDANCE_CREATE" },
      {
        href: "/attendance",
        label: "Attendance",
        icon: CalendarCheck,
        authority: "ATTENDANCE_VIEW",
      },
      {
        href: "/payments",
        label: "Payments",
        icon: CreditCard,
        authority: "PAYMENT_VIEW",
      },
      { href: "/notifications", label: "Notifications", icon: Bell, gap: "notifications" },
      { href: "/reports", label: "Reports", icon: BarChart3, authority: "REPORT_VIEW" },
    ],
  },
  {
    label: "Settings",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

/** Breadcrumb trail for a pathname, e.g. /students/12/edit. */
export function breadcrumbsFor(pathname: string): { label: string; href?: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href?: string }[] = [{ label: "Home", href: "/dashboard" }];

  let acc = "";
  segments.forEach((segment, index) => {
    acc += `/${segment}`;
    const isLast = index === segments.length - 1;
    const known = NAVIGATION.flatMap((s) => s.items).find((i) => i.href === acc);
    const label =
      known?.label ??
      (/^\d+$/.test(segment)
        ? `#${segment}`
        : segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
    crumbs.push({ label, href: isLast ? undefined : acc });
  });

  return crumbs;
}
