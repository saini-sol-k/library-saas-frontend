import type { Metadata } from "next";
import { ApiGapNotice } from "@/components/ui/states";
import { PageHeader } from "@/layouts/app-shell";

export const metadata: Metadata = { title: "Seats" };

export default function SeatsPage() {
  return (
    <>
      <PageHeader title="Seats" description="Seat inventory, zones and live occupancy." />
      <div className="max-w-3xl">
        <ApiGapNotice gap="seats" />
      </div>
    </>
  );
}
