import React, { Suspense } from "react";
import { connection } from "next/server";
import { getTrackedMediaAction } from "@/app/actions/media";
import MainViewingPane from "@/components/MainViewingPane";
import { LocalViewMode } from "@/lib/types";

interface HomePageProps {
  searchParams: Promise<{ view?: string }>;
}

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
        <div className="border border-stone-300 rounded-md bg-stone-50 p-6 text-xs uppercase font-mono text-stone-600 shadow-sm">
          LOADING KO-AX MAIN VIEWING PANE...
        </div>
      }
    >
      <MainViewLoader searchParams={searchParams} />
    </Suspense>
  );
}
