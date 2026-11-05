import React, { Suspense } from "react";
import { connection } from "next/server";
import SearchResultsPane from "@/components/SearchResultsPane";
import { searchAndMergeMedia } from "@/app/actions/media";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

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
        <div className="border border-stone-300 rounded-md bg-stone-50 p-6 text-xs uppercase font-mono text-stone-600 shadow-sm">
          QUERYING TMDB API &amp; CROSS-REFERENCING SUPABASE user_media...
        </div>
      }
    >
      <SearchResultsPipeline searchParams={searchParams} />
    </Suspense>
  );
}
