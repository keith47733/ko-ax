import React, { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getMediaDetailAction } from "@/app/actions/media";
import MediaDetailView from "@/components/MediaDetailView";

interface MediaDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ type?: string }>;
}

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

  const { media, dataSource } = await getMediaDetailAction(
    tmdbId,
    resolvedSearch.type as "movie" | "tv" | undefined
  );

  if (!media) {
    return (
      <div className="border border-stone-300 rounded-md bg-stone-50 p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm">
        <span className="font-mono text-xs uppercase font-medium text-red-700 block">
          [ 404 • MEDIA RECORD NOT FOUND ]
        </span>
        <h1 className="font-serif text-2xl text-stone-900 font-bold tracking-tight">
          Title Cannot Be Located
        </h1>
        <p className="text-xs font-sans text-stone-600 leading-relaxed">
          The requested media item (#{tmdbId}) could not be resolved from local tracking or the TMDB repository.
        </p>
        <div className="pt-2">
          <Link
            href="/?view=library"
            className="inline-block px-5 py-2.5 bg-stone-800 text-white font-sans text-xs uppercase tracking-wider font-medium rounded-md shadow-sm hover:bg-stone-700 transition-colors"
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
        <div className="border border-stone-300 rounded-md bg-stone-50 p-6 text-xs uppercase font-medium max-w-lg mx-auto my-12 font-mono text-stone-600 shadow-sm">
          [ Loading Media Detail &amp; Assets... ]
        </div>
      }
    >
      <MediaDetailLoader {...props} />
    </Suspense>
  );
}
