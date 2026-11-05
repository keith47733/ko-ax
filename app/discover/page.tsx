import React, { Suspense } from "react";
import { connection } from "next/server";
import { getDiscoveryRecommendationsAction } from "@/app/actions/media";
import DiscoveryView from "@/components/DiscoveryView";
import { MediaType } from "@/lib/types";

interface DiscoverPageProps {
  searchParams: Promise<{
    seed?: string;
    type?: string;
    genre?: string;
    decade?: string;
  }>;
}

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
  const rawSeed = resolvedParams.seed ? parseInt(resolvedParams.seed, 10) : undefined;
  const seedId = rawSeed && !isNaN(rawSeed) ? rawSeed : undefined;
  const mediaType: MediaType = resolvedParams.type === "tv" ? "tv" : "movie";
  const genre = resolvedParams.genre || "all";
  const decade = resolvedParams.decade || "all";

  const initialData = await getDiscoveryRecommendationsAction({
    mediaType,
    seedId,
    genreKey: genre,
    eraKey: decade,
    page: 1,
  });

  return (
    <DiscoveryView
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
          <div className="border border-stone-300 rounded-md bg-stone-50 p-6 text-xs uppercase font-mono text-stone-600 shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-stone-700 animate-pulse" />
            <span>DISCOVERY ENGINE: RUNNING TMDB RECOMMENDATIONS &amp; MERGING USER LIBRARY...</span>
          </div>
        }
      >
        <DiscoverPipeline searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
