import React, { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getMediaDetailAction } from "@/app/actions/media";
import MediaDetailView from "@/components/MediaDetailView";
import LoadingSpinner from "@/components/LoadingSpinner";
import { MediaDetailPageProps } from "@/types";

async function MediaDetailLoader({
  params,
  searchParams,
}: MediaDetailPageProps) {
  await connection();
  const resolvedParams = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const tmdbId = Number(resolvedParams.id);

  if (!tmdbId || isNaN(tmdbId)) {
    notFound();
  }

  const rawType = Array.isArray(resolvedSearch.type)
    ? resolvedSearch.type[0]
    : resolvedSearch.type;
  const typeHint =
    rawType === "tv" || rawType === "movie" ? rawType : undefined;

  const { media, dataSource } = await getMediaDetailAction(tmdbId, typeHint);

  if (!media) {
    return (
      <div className="mx-auto my-12 max-w-lg space-y-4 rounded-2xl border border-zinc-400/90 bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-12">
        <span className="block font-mono text-xs font-black text-rose-600 uppercase">
          [ 404 • MEDIA RECORD NOT FOUND ]
        </span>
        <h1 className="font-sans text-2xl font-black tracking-tight text-zinc-950">
          Title Cannot Be Located
        </h1>
        <p className="font-sans text-sm leading-relaxed text-zinc-600">
          The requested media item (#{tmdbId}) could not be resolved from local
          tracking or the TMDB repository.
        </p>
        <div className="pt-2">
          <Link
            href="/?view=library"
            className="inline-block rounded-xl bg-zinc-600 px-5 py-2.5 font-mono text-xs font-bold tracking-wider text-white uppercase shadow-sm transition-colors hover:bg-zinc-500"
          >
            ← Return to Library
          </Link>
        </div>
      </div>
    );
  }

  return <MediaDetailView initialMedia={media} dataSource={dataSource} />;
}

export default function MediaDetailPage(props: MediaDetailPageProps) {
  return (
    <Suspense
      fallback={
        <div className="relative -m-3 -mt-3 sm:-m-4 sm:-mt-4 md:-m-6 md:-mt-6">
          {/* Persistent Lighter Sub-Bar directly flush under header during loading */}
          <div className="fixed top-16 inset-x-0 z-30 border-b border-zinc-200/80 bg-canvas/90 shadow-xs backdrop-blur-md transition-colors">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-2.5">
              <Link
                href="/"
                className="btn-zinc-interactive shrink-0 inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 font-mono text-xs font-bold text-white shadow-sm"
              >
                <span>←</span>
                <span>BACK</span>
              </Link>

              {/* Centered contextual search input placeholder */}
              <div className="flex h-9 w-full max-w-xs items-center overflow-hidden rounded-xl bg-white px-3 shadow-xs ring-1 ring-zinc-300 sm:max-w-sm md:max-w-md lg:max-w-lg">
                <span className="font-sans text-xs text-zinc-400">
                  SEARCH MOVIES &amp; TV SHOWS...
                </span>
              </div>

              <div className="h-9 w-24 shrink-0" />
            </div>
          </div>

          <div className="flex w-full items-center justify-center pt-36 pb-24">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      }
    >
      <MediaDetailLoader {...props} />
    </Suspense>
  );
}
