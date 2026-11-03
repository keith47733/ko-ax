import React, { Suspense } from "react";
import Link from "next/link";
import MediaCard from "@/components/MediaCard";
import { searchAndMergeMedia } from "@/app/actions/media";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

async function SearchResultsPipeline({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedParams = await searchParams;
  const query = (resolvedParams.q ?? "").trim();

  // Intercept raw TMDB API search results and strictly cross-reference TMDB IDs
  // against the local Supabase `user_media` table via searchAndMergeMedia(query).
  const { items, rawTmdbCount, matchedDbCount, dataSource } =
    await searchAndMergeMedia(query);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <section className="border-2 border-black bg-white p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b-2 border-black pb-3">
          <div>
            <span className="text-xs uppercase font-bold text-neutral-600 block">
              GLOBAL SEARCH
            </span>
            <h1 className="text-xl font-bold uppercase">
              {query ? `RESULTS FOR "${query}"` : "SEARCH"}
            </h1>
          </div>
          <div className="text-xs uppercase border-2 border-black px-3 py-1 bg-neutral-100 font-bold self-start md:self-auto">
            {items.length} {items.length === 1 ? "RESULT" : "RESULTS"}
          </div>
        </div>

        {/* Quick Search Suggestions */}
        <div className="pt-3 flex flex-wrap items-center gap-2 text-xs uppercase">
          <span className="font-bold text-neutral-600">SUGGESTIONS:</span>
          {["Severance", "Dune", "The Bear", "Andor", "Blade Runner", "Nosferatu"].map(
            (sample) => (
              <Link
                key={sample}
                href={`/search?q=${encodeURIComponent(sample)}`}
                className="border-2 border-black px-2 py-0.5 bg-white hover:bg-black hover:text-white font-bold"
              >
                {sample}
              </Link>
            )
          )}
        </div>
      </section>

      {/* Results Grid */}
      {!query ? (
        <section className="border-2 border-black bg-white p-8 text-center text-xs uppercase font-bold">
          TYPE A MOVIE OR TV SHOW TITLE IN THE HEADER SEARCH BAR AND PRESS ENTER.
        </section>
      ) : items.length === 0 ? (
        <section className="border-2 border-black bg-white p-8 text-center text-xs uppercase">
          NO TMDB MEDIA RESULTS FOUND FOR &quot;{query}&quot;.
        </section>
      ) : (
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((mergedItem) => (
              <MediaCard key={mergedItem.tmdb_id} media={mergedItem} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <Suspense
      fallback={
        <div className="border-2 border-black bg-white p-6 text-xs uppercase font-bold">
          QUERYING TMDB API &amp; CROSS-REFERENCING SUPABASE user_media...
        </div>
      }
    >
      <SearchResultsPipeline searchParams={searchParams} />
    </Suspense>
  );
}

