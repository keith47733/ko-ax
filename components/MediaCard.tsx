"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { upsertUserMediaAction } from "@/app/actions/media";
import { CompassIcon } from "@/components/Icons";
import { StatusPopupButton } from "@/components/StatusToggle";
import { MediaCardProps, MediaStatus, MergedMediaItem } from "@/types";
import { formatYear, getDecadeFromDate } from "@/lib/utils";

export default function MediaCard({
  media,
  onStateChange,
}: MediaCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<MediaStatus | null>(media.status);
  const [rating, setRating] = useState<number | null>(media.rating);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const ratingRef = useRef<HTMLDivElement>(null);

  // Sync state if incoming props change
  const [prevMediaKey, setPrevMediaKey] = useState(
    `${media.tmdb_id}-${media.status}-${media.rating}`
  );
  const currentMediaKey = `${media.tmdb_id}-${media.status}-${media.rating}`;
  if (prevMediaKey !== currentMediaKey) {
    setPrevMediaKey(currentMediaKey);
    setStatus(media.status);
    setRating(media.rating);
  }

  // Close rating popover when clicking outside or pressing Escape
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (ratingRef.current && !ratingRef.current.contains(e.target as Node)) {
        setIsRatingOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsRatingOpen(false);
      }
    }
    if (isRatingOpen) {
      window.addEventListener("mousedown", handlePointerDown);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRatingOpen]);

  function mutateUserMedia(
    nextStatus: MediaStatus | null,
    nextRating: number | null
  ) {
    const previousStatus = status;
    const previousRating = rating;

    setStatus(nextStatus);
    setRating(nextRating);
    if (nextRating === null) {
      setHoverRating(null);
    }

    const optimisticItem: MergedMediaItem = {
      ...media,
      status: nextStatus,
      rating: nextRating,
      updated_at: new Date().toISOString(),
    };
    onStateChange?.(optimisticItem);

    startTransition(async () => {
      try {
        const result = await upsertUserMediaAction({
          tmdb_id: media.tmdb_id,
          title: media.title,
          media_type: media.media_type,
          poster_path: media.poster_path,
          release_date: media.release_date,
          next_air_date: media.next_air_date,
          next_episode_label: media.next_episode_label,
          overview: media.overview ?? null,
          status: nextStatus,
          rating: nextRating,
        });
        setStatus(result.status);
        setRating(result.rating);
      } catch {
        setStatus(previousStatus);
        setRating(previousRating);
      }
    });
  }

  function handleStatusSelect(clickedStatus: MediaStatus) {
    const nextStatus: MediaStatus | null =
      status === clickedStatus ? null : clickedStatus;
    const nextRating = nextStatus === null ? null : rating;
    mutateUserMedia(nextStatus, nextRating);
  }

  function handleRatingSelect(starValue: number) {
    const effectiveStatus: MediaStatus =
      status === "watching" ? "watching" : "watched";
    mutateUserMedia(effectiveStatus, starValue);
    setIsRatingOpen(false);
    setHoverRating(null);
  }

  function handleRatingClear() {
    mutateUserMedia(status, null);
    setIsRatingOpen(false);
    setHoverRating(null);
  }

  function handlePosterClick() {
    router.push(`/media/${media.tmdb_id}?type=${media.media_type}`);
  }

  function handleToggleRating(e: React.MouseEvent) {
    e.stopPropagation();
    setIsRatingOpen((prev) => !prev);
  }

  const year = formatYear(media.release_date || media.next_air_date);

  return (
    <article
      data-testid={`media-card-${media.tmdb_id}`}
      onClick={handlePosterClick}
      title={`${media.title} (${year}) • Click to view details`}
      className="bg-white rounded-2xl border border-zinc-400/90 shadow-[0_10px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_16px_40px_rgb(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-200 overflow-visible flex flex-col relative group cursor-pointer select-none"
    >
      {/* =====================================================================
          1. IMAGE CONTAINER (Aspect 2/3, Soft rounded top)
          ===================================================================== */}
      <div className="relative w-full aspect-2/3 bg-zinc-200 rounded-t-[15px] overflow-hidden">
        {media.poster_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
            alt={`${media.title} poster`}
            className="w-full h-full object-cover brightness-[0.88] saturate-[0.95] group-hover:brightness-100 group-hover:saturate-100 group-hover:scale-104 transition-all duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full p-6 flex flex-col justify-center items-center text-center bg-[#F4F3F0]">
            <span className="font-sans text-base sm:text-lg text-zinc-950 leading-tight font-bold">
              {media.title}
            </span>
            <span className="text-xs font-mono text-zinc-600 mt-2 uppercase tracking-wider font-bold">
              NO POSTER
            </span>
          </div>
        )}

        {/* Floating High-Contrast Year Badge (Standardized w-16 h-7.5) */}
        <div className="absolute top-2.5 left-2.5 min-w-16 h-7.5 px-2.5 bg-white/95 backdrop-blur-md rounded-lg text-xs sm:text-sm font-mono font-black text-zinc-950 flex items-center justify-center pointer-events-none shadow-md ring-2 ring-white/90 leading-none">
          {year}
        </div>

        {/* Status Toggle Button & Rating Badge (Top Right HUD) */}
        <div className="absolute top-2.5 right-2.5 z-20 flex flex-col items-end gap-1.5">
          <StatusPopupButton
            status={status}
            mediaType={media.media_type}
            onSelect={handleStatusSelect}
            disabled={isPending}
          />

          {rating !== null ? (
            <button
              type="button"
              onClick={handleToggleRating}
              title={`Your rating: ${Number(rating).toFixed(1)}/10 • Click to edit`}
              className="min-w-16 h-7.5 px-2 bg-white/95 hover:bg-white text-zinc-950 rounded-lg text-xs sm:text-sm font-mono font-black flex items-center justify-center gap-1 shadow-md ring-2 ring-white/90 backdrop-blur-md cursor-pointer hover:scale-105 transition-all shrink-0 leading-none"
            >
              <span className="text-amber-500 text-xs sm:text-sm leading-none shrink-0">★</span>
              <span className="leading-none">{Number(rating).toFixed(1)}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleToggleRating}
              title="Not rated yet • Click to rate"
              className="min-w-16 h-7.5 px-2 bg-white/90 hover:bg-white text-zinc-600 hover:text-zinc-950 rounded-lg text-[11px] sm:text-xs font-mono font-extrabold flex items-center justify-center gap-1 shadow-md ring-2 ring-white/90 backdrop-blur-md cursor-pointer hover:scale-105 transition-all shrink-0 leading-none"
            >
              <span className="text-zinc-400 text-xs leading-none shrink-0">★</span>
              <span className="leading-none">RATE</span>
            </button>
          )}
        </div>

        {/* Find Similar Titles Discovery Link (Bottom Right HUD - Shrunk 50% to w-8.5 h-8.5 in Soft Slate Charcoal) */}
        <div className="absolute bottom-2.5 right-2.5 z-20">
          <Link
            href={`/discover?type=${media.media_type}&seed=${media.tmdb_id}&decade=${getDecadeFromDate(media.release_date || media.next_air_date)}`}
            onClick={(e) => e.stopPropagation()}
            title={`Find titles similar to ${media.title}`}
            className="w-8.5 h-8.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center backdrop-blur-md shadow-md ring-2 ring-white/90 transition-all cursor-pointer shrink-0"
          >
            <CompassIcon className="w-4.5 h-4.5 shrink-0" />
          </Link>
        </div>
      </div>

      {/* =====================================================================
          2. CONTENT STRIP (Tightened Padding, Clear Typographic Hierarchy)
          ===================================================================== */}
      <div className="px-4 pb-4 pt-2 sm:pt-2.5 flex flex-col gap-1">
        <h3 className="font-sans text-base sm:text-lg font-bold text-zinc-950 leading-snug truncate">
          {media.title}
        </h3>
        <span className="font-mono text-xs text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
          <span>{media.media_type === "tv" ? "TV SHOW" : "MOVIE"}</span>
          <span className="text-zinc-300">•</span>
          <span>
            {media.tmdb_rating !== undefined && media.tmdb_rating !== null ? `★ ${media.tmdb_rating.toFixed(1)} TMDB` : "UNRATED"}
          </span>
        </span>
      </div>

      {/* =====================================================================
          3. INDEPENDENT RATING POP-UP
          ===================================================================== */}
      {isRatingOpen && (
        <>
          <div
            className="fixed inset-0 z-25 cursor-default bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsRatingOpen(false);
            }}
          />
          <div
            ref={ratingRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-24 right-2 z-30 w-72 sm:w-80 rounded-2xl bg-white p-3 shadow-2xl ring-2 ring-black/10 text-zinc-950 select-text space-y-2"
          >
            {/* Header with RATE (1-10) on left, CLEAR & X on right */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5 w-full">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-800">
                RATE (1-10)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRatingClear();
                  }}
                  disabled={isPending || rating === null}
                  className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-md transition-colors ${
                    rating !== null
                      ? "text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 cursor-pointer"
                      : "text-zinc-300 bg-[#F4F3F0] cursor-not-allowed select-none"
                  }`}
                  title="Clear rating"
                >
                  CLEAR
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsRatingOpen(false);
                  }}
                  className="text-sm font-mono font-bold text-zinc-400 hover:text-zinc-950 cursor-pointer leading-none p-0"
                  title="Close without changing"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 10-Star Interactive Rating Picker */}
            <div
              className="flex items-center justify-between w-full"
              onMouseLeave={() => setHoverRating(null)}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starVal, idx) => {
                const isHovering = hoverRating !== null;
                const isFilledHover = isHovering && starVal <= hoverRating;
                const isFilledSaved =
                  !isHovering && rating !== null && starVal <= rating;

                const starClass = isFilledSaved
                  ? "fill-amber-500 stroke-amber-600"
                  : isFilledHover
                  ? "fill-amber-300 stroke-amber-500"
                  : "fill-zinc-200 stroke-zinc-400 stroke-[1.4]";

                const paddingClass =
                  idx === 0
                    ? "pl-0 pr-0.5 py-0.5"
                    : idx === 9
                    ? "pr-0 pl-0.5 py-0.5"
                    : "px-0.5 py-0.5";

                return (
                  <button
                    key={starVal}
                    type="button"
                    onClick={() => handleRatingSelect(starVal)}
                    onMouseEnter={() => setHoverRating(starVal)}
                    disabled={isPending}
                    className={`cursor-pointer text-zinc-900 hover:scale-125 transition-transform flex items-center justify-center shrink-0 ${paddingClass}`}
                    title={`Rate ${starVal} / 10`}
                  >
                    <svg
                      className={`w-4.5 h-4.5 transition-colors ${starClass}`}
                      viewBox="0 0 24 24"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </article>
  );
}
