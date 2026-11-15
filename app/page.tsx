import { getTrackedMediaAction } from "@/app/actions/media";
import LoadingSpinner from "@/components/LoadingSpinner";
import MainViewingPane from "@/components/MainViewingPane";
import { HomePageProps, LocalViewMode } from "@/types";
import { connection } from "next/server";
import { Suspense } from "react";

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
        <div className="flex w-full items-center justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <MainViewLoader searchParams={searchParams} />
    </Suspense>
  );
}
