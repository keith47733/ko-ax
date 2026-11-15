import React, { Suspense } from "react";
import { connection } from "next/server";
import SearchResultsPane from "@/components/SearchResultsPane";
import LoadingSpinner from "@/components/LoadingSpinner";
import { searchAndMergeMedia } from "@/app/actions/media";
import { SearchPageProps } from "@/types";

async function SearchResultsPipeline({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await connection();
  const resolvedParams = await searchParams;
  const query = (resolvedParams.q ?? "").trim();

  // Intercept raw TMDB API search results and strictly cross-reference TMDB IDs
  // against the local Supabase `user_media` table via searchAndMergeMedia(query).
  const { items } = await searchAndMergeMedia(query);

  return <SearchResultsPane query={query} initialItems={items} />;
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <SearchResultsPipeline searchParams={searchParams} />
    </Suspense>
  );
}
