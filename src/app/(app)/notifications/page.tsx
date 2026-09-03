import type { Metadata } from "next";
import { ApiGapNotice } from "@/components/ui/states";
import { PageHeader } from "@/layouts/app-shell";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notifications" description="In-app alerts and delivery history." />
      <div className="max-w-3xl">
        <ApiGapNotice gap="notifications" />
      </div>
    </>
  );
}
