import React, { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getMediaDetailAction } from "@/app/actions/media";
import MediaDetailView from "@/components/MediaDetailView";
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
      <div className="rounded-2xl bg-white p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto my-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-400/90">
        <span className="font-mono text-xs uppercase font-black text-rose-600 block">
          [ 404 • MEDIA RECORD NOT FOUND ]
        </span>
        <h1 className="font-sans text-2xl text-zinc-950 font-black tracking-tight">
          Title Cannot Be Located
        </h1>
        <p className="text-sm font-sans text-zinc-600 leading-relaxed">
          The requested media item (#{tmdbId}) could not be resolved from local tracking or the TMDB repository.
        </p>
        <div className="pt-2">
          <Link
            href="/?view=library"
            className="inline-block px-5 py-2.5 bg-zinc-600 hover:bg-zinc-500 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-xl shadow-sm transition-colors"
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
        <div className="rounded-2xl bg-white p-6 text-xs uppercase font-medium max-w-lg mx-auto my-12 font-mono text-zinc-500 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          [ Loading Media Detail &amp; Assets... ]
        </div>
      }
    >
      <MediaDetailLoader {...props} />
    </Suspense>
  );
}
