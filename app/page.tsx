import React, { Suspense } from "react";
import { getTrackedMediaAction } from "@/app/actions/media";
import MainViewingPane, { LocalViewMode } from "@/components/MainViewingPane";

interface HomePageProps {
  searchParams: Promise<{ view?: string }>;
}

const VALID_VIEWS = new Set<LocalViewMode>([
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
  const resolved = await searchParams;
  const rawView = (resolved.view || "watching") as LocalViewMode;
  const activeView: LocalViewMode = VALID_VIEWS.has(rawView)
    ? rawView
    : "watching";

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
        <div className="border-2 border-black bg-white p-6 text-xs uppercase font-bold">
          LOADING KO-AX MAIN VIEWING PANE...
        </div>
      }
    >
      <MainViewLoader searchParams={searchParams} />
    </Suspense>
  );
}

