"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CompassIcon, ProjectorIcon, TvIcon } from "@/components/Icons";
import StatusRatingControl from "@/components/StatusRatingControl";
import { formatYear, getDecadeFromDate } from "@/lib/utils";
import { MediaCardProps } from "@/types";

export default function MediaCard({ media, onStateChange }: MediaCardProps) {
  const router = useRouter();
  const year = formatYear(media.release_date || media.next_air_date);
  const ratingSource = (
    media.rating_source || (media.status ? "imdb" : "tmdb")
  ).toUpperCase();

  function handleCardClick() {
    router.push(`/media/${media.tmdb_id}?type=${media.media_type}`);
  }

  return (
    <article
      data-testid={`media-card-${media.tmdb_id}`}
      onClick={handleCardClick}
      title={`${media.title} (${year}) • Click to view details`}
      className="group relative flex cursor-pointer flex-col overflow-visible rounded-2xl border border-zinc-400/90 bg-white shadow-[0_10px_30px_rgb(0,0,0,0.06)] transition-all duration-200 select-none hover:shadow-[0_16px_40px_rgb(0,0,0,0.12)]"
    >
      {/* =====================================================================
          1. IMAGE CONTAINER (Aspect 2/3, Soft rounded top, overflow-visible for popup)
          ===================================================================== */}
      <div className="relative aspect-2/3 w-full rounded-t-[15px] bg-zinc-200">
        {/* Inner image frame: strictly overflow-hidden so zoom & corners are clipped */}
        <div className="absolute inset-0 overflow-hidden rounded-t-[15px]">
          {media.poster_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
              alt={`${media.title} poster`}
              className="h-full w-full object-cover brightness-[0.88] saturate-[0.95] transition-all duration-300 group-hover:scale-104 group-hover:brightness-100 group-hover:saturate-100"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-canvas p-6 text-center">
              <span className="font-sans text-base leading-tight font-bold text-zinc-950 sm:text-lg">
                {media.title}
              </span>
              <span className="mt-2 font-mono text-xs font-bold tracking-wider text-zinc-600 uppercase">
                NO POSTER
              </span>
            </div>
          )}
        </div>

        {/* Status & Rating Control Leaf Component (Top Right HUD) */}
        <div className="absolute top-2 right-2 z-20">
          <StatusRatingControl
            media={media}
            onStateChange={onStateChange}
            variant="badge"
          />
        </div>
      </div>

      {/* =====================================================================
          2. CONTENT STRIP (Line 1: Icon - Title / Line 2: Year - Rating, Right: Find Similar)
          ===================================================================== */}
      <div className="flex items-center justify-between gap-2.5 px-3.5 py-3">
        {/* Left Column: 2-line media metadata */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* Line 1: ICON - TITLE */}
          <div className="flex items-center gap-1.5 min-w-0">
            {media.media_type === "tv" ? (
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-indigo-300 bg-indigo-100 shadow-xs"
                title="TV Show"
              >
                <TvIcon className="h-3.5 w-3.5 text-black stroke-[2.2]" />
              </span>
            ) : (
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-amber-300 bg-amber-100 shadow-xs"
                title="Movie"
              >
                <ProjectorIcon className="h-3.5 w-3.5 text-black stroke-[2.2]" />
              </span>
            )}
            <h3
              className="truncate font-sans text-sm leading-snug font-bold text-zinc-950 sm:text-base"
              title={media.title}
            >
              {media.title}
            </h3>
          </div>

          {/* Line 2: YEAR • RATING */}
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider pl-0.5">
            <span className="font-bold text-zinc-950">{year}</span>
            <span className="text-zinc-300">•</span>
            {media.tmdb_rating !== undefined && media.tmdb_rating !== null ? (
              <span className="flex items-center gap-1 font-bold">
                <span className="font-bold text-zinc-950">
                  {media.tmdb_rating.toFixed(1)}
                </span>
                <span className="text-amber-500 font-black">★</span>
                <span className="font-semibold text-zinc-400">
                  {ratingSource}
                </span>
              </span>
            ) : (
              <span className="font-medium text-zinc-400">UNRATED</span>
            )}
          </div>
        </div>

        {/* Right Column: Find Similar button vertically centered */}
        <div className="shrink-0 flex items-center">
          <Link
            href={`/discover?type=${media.media_type}&seed=${media.tmdb_id}&decade=${getDecadeFromDate(media.release_date || media.next_air_date)}`}
            onClick={(e) => e.stopPropagation()}
            title={`Find titles similar to ${media.title}`}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-zinc-200/90 bg-canvas text-zinc-600 shadow-xs transition-all duration-150 hover:bg-zinc-800 hover:border-zinc-800 hover:text-white hover:scale-105 active:scale-95"
          >
            <CompassIcon className="h-4 w-4 shrink-0" />
          </Link>
        </div>
      </div>
    </article>
  );
}
