import { getTrackedMediaAction } from "@/app/actions/media";
import LoadingSpinner from "@/components/LoadingSpinner";
import ReleaseCalendar from "@/components/ReleaseCalendar";
import { connection } from "next/server";
import React, { Suspense } from "react";

async function CalendarDataLoader() {
  await connection();
  const { items, dataSource } = await getTrackedMediaAction();
  return <ReleaseCalendar initialItems={items} dataSource={dataSource} />;
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <CalendarDataLoader />
    </Suspense>
  );
}
