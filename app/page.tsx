import React, { Suspense } from "react";
import { connection } from "next/server";
import { getTrackedMediaAction } from "@/app/actions/media";
import MainViewingPane from "@/components/MainViewingPane";
import { HomePageProps, LocalViewMode } from "@/types";

const VALID_VIEWS = new Set<LocalViewMode>([
  "library",
  "want_to_watch",
  "watching",
  "watched",
  "calendar",
]);

async function MainViewLoader({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await connection();
  const resolved = await searchParams;
  const rawView = (resolved.view || "library") as LocalViewMode;
  const activeView: LocalViewMode = VALID_VIEWS.has(rawView)
    ? rawView
    : "library";

  const { items, dataSource } = await getTrackedMediaAction();

  return (
    <MainViewingPane
      initialItems={items}
      activeView={activeView}
      dataSource={dataSource}
    />
  );
}

export default function HomePage({ searchParams }: HomePageProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl bg-white p-6 text-xs uppercase font-mono text-zinc-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          LOADING KURA MAIN VIEWING PANE...
        </div>
      }
    >
      <MainViewLoader searchParams={searchParams} />
    </Suspense>
  );
}
