import React, { Suspense } from "react";
import { connection } from "next/server";
import { getTrackedMediaAction } from "@/app/actions/media";
import ReleaseCalendar from "@/components/ReleaseCalendar";

async function CalendarDataLoader() {
  await connection();
  const { items, dataSource } = await getTrackedMediaAction();
  return <ReleaseCalendar initialItems={items} dataSource={dataSource} />;
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="border border-stone-300 rounded-md bg-stone-50 p-6 text-xs uppercase font-mono text-stone-600 shadow-sm">
          LOADING RELEASE CALENDAR RADAR...
        </div>
      }
    >
      <CalendarDataLoader />
    </Suspense>
  );
}
