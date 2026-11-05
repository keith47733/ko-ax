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
        <div className="rounded-2xl bg-white p-6 text-xs uppercase font-mono text-zinc-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          LOADING RELEASE CALENDAR RADAR...
        </div>
      }
    >
      <CalendarDataLoader />
    </Suspense>
  );
}
