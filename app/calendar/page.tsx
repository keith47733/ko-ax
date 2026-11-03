import React, { Suspense } from "react";
import { getTrackedMediaAction } from "@/app/actions/media";
import ReleaseCalendar from "@/components/ReleaseCalendar";

async function CalendarDataLoader() {
  const { items, dataSource } = await getTrackedMediaAction();
  return <ReleaseCalendar initialItems={items} dataSource={dataSource} />;
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="border-2 border-black bg-white p-6 text-xs uppercase font-bold">
          LOADING RELEASE CALENDAR RADAR...
        </div>
      }
    >
      <CalendarDataLoader />
    </Suspense>
  );
}

