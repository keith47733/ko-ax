"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CompassIcon, ProjectorIcon, TvIcon } from "@/components/Icons";
import StatusRatingControl from "@/components/StatusRatingControl";
import { formatYear, getDecadeFromDate } from "@/lib/utils";
import { MediaCardProps } from "@/types";

export default function MediaListItem({
  media,
  onStateChange,
}: MediaCardProps) {
  const router = useRouter();
  const year = formatYear(media.release_date || media.next_air_date);
  const ratingSource = (
    media.rating_source || (media.status ? "imdb" : "tmdb")
  ).toUpperCase();

  function handleRowClick() {
    router.push(`/media/${media.tmdb_id}?type=${media.media_type}`);
  }

  return (
    <article
      data-testid={`media-list-item-${media.tmdb_id}`}
      onClick={handleRowClick}
      title={`${media.title} (${year}) • Click to view details`}
      className="group relative flex cursor-pointer items-center justify-between gap-3.5 rounded-2xl border border-zinc-200/90 bg-white p-2.5 sm:p-3 shadow-[0_2px_8px_rgb(0,0,0,0.04)] transition-all duration-200 select-none hover:border-zinc-300 hover:shadow-[0_6px_20px_rgb(0,0,0,0.08)]"
    >
      {/* Left: Thumbnail & 2-Line Metadata */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Micro-poster thumbnail */}
        <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-200 sm:h-17 sm:w-12">
          {media.poster_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://image.tmdb.org/t/p/w200${media.poster_path}`}
              alt={`${media.title} poster thumbnail`}
              className="h-full w-full object-cover brightness-[0.92] saturate-[0.95] transition-all duration-300 group-hover:scale-105 group-hover:brightness-100 group-hover:saturate-100"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#F4F3F0] text-zinc-400">
              {media.media_type === "tv" ? (
                <TvIcon className="h-5 w-5" />
              ) : (
                <ProjectorIcon className="h-5 w-5" />
              )}
            </div>
          )}
        </div>

        {/* 2-Line Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* Line 1: ICON - TITLE */}
          <div className="flex items-center gap-2 min-w-0">
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
              className="truncate font-sans text-sm font-bold text-zinc-950 sm:text-base group-hover:text-zinc-800 transition-colors"
              title={media.title}
            >
              {media.title}
            </h3>
          </div>

          {/* Line 2: YEAR • RATING */}
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider pl-0.5 text-zinc-600">
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

            {/* Optional TV Season count */}
            {media.number_of_seasons ? (
              <>
                <span className="text-zinc-300">•</span>
                <span className="hidden sm:inline font-semibold text-zinc-500">
                  {media.number_of_seasons}{" "}
                  {media.number_of_seasons === 1 ? "SEASON" : "SEASONS"}
                </span>
              </>
            ) : null}

            {/* User Personal Rating Badge if set */}
            {media.rating !== null && (
              <>
                <span className="text-zinc-300">•</span>
                <span className="flex items-center gap-1 font-bold text-amber-600">
                  <span className="text-amber-500">★</span>
                  <span>{media.rating}/10</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div className="relative flex shrink-0 items-center gap-2">
        {/* Status & Rating Control Leaf Component */}
        <StatusRatingControl
          media={media}
          onStateChange={onStateChange}
          variant="row"
        />

        {/* Find Similar Button */}
        <Link
          href={`/discover?type=${media.media_type}&seed=${media.tmdb_id}&decade=${getDecadeFromDate(media.release_date || media.next_air_date)}`}
          onClick={(e) => e.stopPropagation()}
          title={`Find titles similar to ${media.title}`}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-zinc-200/90 bg-[#F4F3F0] text-zinc-600 shadow-xs transition-all duration-150 hover:bg-zinc-800 hover:border-zinc-800 hover:text-white hover:scale-105 active:scale-95"
        >
          <CompassIcon className="h-4 w-4 shrink-0" />
        </Link>
      </div>
    </article>
  );
}
