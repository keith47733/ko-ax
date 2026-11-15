import React, { Suspense } from "react";
import { connection } from "next/server";
import { getDiscoveryRecommendationsAction } from "@/app/actions/media";
import DiscoveryView from "@/components/DiscoveryView";
import LoadingSpinner from "@/components/LoadingSpinner";
import { DiscoverPageProps, MediaType } from "@/types";

async function DiscoverPipeline({
  searchParams,
}: {
  searchParams: Promise<{
    seed?: string;
    type?: string;
    genre?: string;
    decade?: string;
  }>;
}) {
  await connection();
  const resolvedParams = await searchParams;
  const rawSeed = resolvedParams.seed
    ? parseInt(resolvedParams.seed, 10)
    : undefined;
  const seedId = rawSeed && !isNaN(rawSeed) ? rawSeed : undefined;
  const mediaType: MediaType = resolvedParams.type === "tv" ? "tv" : "movie";
  const genre = resolvedParams.genre || "all";
  const decade = resolvedParams.decade || "all";

  const initialData = await getDiscoveryRecommendationsAction({
    mediaType,
    seedId,
    seedType: mediaType,
    genreKey: genre,
    eraKey: decade,
    page: 1,
  });

  return (
    <DiscoveryView
      key={`${mediaType}-${seedId ?? "auto"}-${genre}-${decade}`}
      initialData={initialData}
      initialMediaType={mediaType}
      seedId={seedId}
      initialGenre={genre}
      initialDecade={decade}
    />
  );
}

export default function DiscoverPage({ searchParams }: DiscoverPageProps) {
  return (
    <main className="w-full">
      <Suspense
        fallback={
          <div className="flex w-full items-center justify-center py-24">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <DiscoverPipeline searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
