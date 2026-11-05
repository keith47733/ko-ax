"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { upsertUserMediaAction } from "@/app/actions/media";
import {
  BookmarkIcon,
  CheckCircleIcon,
  CompassIcon,
  EyeIcon,
} from "@/components/Icons";
import {
  MediaStatus,
  MergedMediaItem,
  getDecadeFromDate,
} from "@/lib/types";

export interface MediaCardProps {
  media: MergedMediaItem;
  onStateChange?: (updated: MergedMediaItem) => void;
}

const STATUS_OPTIONS: Array<{ value: MediaStatus; label: string }> = [
  { value: "want_to_watch", label: "WANT" },
  { value: "watching", label: "WATCHING" },
  { value: "watched", label: "WATCHED" },
];

export default function MediaCard({
  media,
  onStateChange,
}: MediaCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<MediaStatus | null>(media.status);
  const [rating, setRating] = useState<number | null>(media.rating);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const popoverRef = useRef<HTMLDivElement>(null);

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

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsPopoverOpen(false);
      }
    }
    if (isPopoverOpen) {
      window.addEventListener("mousedown", handlePointerDown);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPopoverOpen]);

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

  function handleStatusChange(clickedStatus: MediaStatus) {
    const nextStatus: MediaStatus | null =
      status === clickedStatus ? null : clickedStatus;
    const nextRating = nextStatus === null ? null : rating;
    mutateUserMedia(nextStatus, nextRating);
  }

  function handleRatingClick(starValue: number) {
    if (rating === starValue) return;
    const effectiveStatus: MediaStatus =
      status === "watching" ? "watching" : "watched";
    mutateUserMedia(effectiveStatus, starValue);
  }

  function handleClearRating() {
    if (rating === null) return;
    mutateUserMedia(status, null);
  }

  function handlePosterClick() {
    router.push(`/media/${media.tmdb_id}`);
  }

  function handleTogglePopover(e: React.MouseEvent) {
    e.stopPropagation();
    setIsPopoverOpen((prev) => !prev);
  }

  const year =
    (media.release_date || media.next_air_date || "").slice(0, 4) || "—";

  // Status button styling & icon
  let StatusIcon = BookmarkIcon;
  let statusButtonClasses =
    "bg-stone-50/90 text-stone-500 hover:text-stone-900 hover:bg-stone-100 border border-stone-300";

  if (status === "want_to_watch") {
    StatusIcon = BookmarkIcon;
    statusButtonClasses =
      "bg-orange-700 text-white border-transparent shadow-sm";
  } else if (status === "watching") {
    StatusIcon = EyeIcon;
    statusButtonClasses =
      "bg-stone-800 text-white border-transparent shadow-sm";
  } else if (status === "watched") {
    StatusIcon = CheckCircleIcon;
    statusButtonClasses =
      "bg-emerald-800 text-white border-transparent shadow-sm";
  }

  return (
    <article
      data-testid={`media-card-${media.tmdb_id}`}
      onClick={handlePosterClick}
      title={`${media.title} (${year}) • Click to view details`}
      className="bg-stone-50 border border-stone-300 rounded-md shadow-sm hover:shadow-md shadow-stone-800/5 transition-all overflow-visible flex flex-col relative group cursor-pointer select-none"
    >
      {/* =====================================================================
          1. IMAGE CONTAINER (Aspect 2/3, Press-glass boundary)
          ===================================================================== */}
      <div className="relative w-full aspect-2/3 bg-stone-200 border-b border-stone-200 rounded-t-md overflow-hidden">
        {media.poster_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
            alt={`${media.title} poster`}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full p-6 flex flex-col justify-center items-center text-center bg-stone-100">
            <span className="font-serif text-sm sm:text-base text-stone-800 leading-tight font-semibold">
              {media.title}
            </span>
            <span className="text-[10px] font-mono text-stone-400 mt-2 uppercase tracking-wider">
              NO POSTER
            </span>
          </div>
        )}

        {/* Floating Vintage Year Badge (Blueprint 5.1) */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm border border-stone-300 rounded text-[10px] font-mono font-bold text-stone-800 pointer-events-none shadow-sm">
          {year}
        </div>

        {/* Status Toggle Button & Rating Badge (Top Right HUD) */}
        <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={handleTogglePopover}
            title={`Status: ${status || "Untracked"} • Click to modify`}
            className={`h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-md flex items-center justify-center cursor-pointer backdrop-blur-sm transition-all ${statusButtonClasses}`}
          >
            <StatusIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
          </button>

          {rating !== null && (
            <button
              type="button"
              onClick={handleTogglePopover}
              title={`Your rating: ${rating}/10 • Click to edit`}
              className="bg-white/90 text-stone-800 border border-stone-300 rounded text-[10px] font-mono font-bold px-1.5 py-0.5 flex items-center gap-1 shadow-sm backdrop-blur-sm cursor-pointer"
            >
              <span className="text-amber-600 text-xs leading-none">★</span>
              <span>{rating}</span>
            </button>
          )}
        </div>

        {/* Find Similar Titles Discovery Link (Bottom Right HUD) */}
        <div className="absolute bottom-2 right-2 z-20">
          <Link
            href={`/discover?type=${media.media_type}&seed=${media.tmdb_id}&decade=${getDecadeFromDate(media.release_date || media.next_air_date)}`}
            onClick={(e) => e.stopPropagation()}
            title={`Find titles similar to ${media.title}`}
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-md border border-stone-300 bg-white/90 hover:bg-stone-100 text-stone-600 hover:text-stone-900 flex items-center justify-center backdrop-blur-sm shadow-sm transition-all cursor-pointer"
          >
            <CompassIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          </Link>
        </div>
      </div>

      {/* =====================================================================
          2. CONTENT STRIP (Blueprint 5.1: Serifs for Title, Mono for Meta)
          ===================================================================== */}
      <div className="p-4 flex flex-col gap-1">
        <h3 className="font-serif text-lg font-semibold text-stone-900 leading-tight truncate">
          {media.title}
        </h3>
        <span className="font-mono text-xs text-stone-500 uppercase tracking-wider">
          {media.media_type === "tv" ? "TV SHOW" : "MOVIE"} • {media.tmdb_rating !== undefined && media.tmdb_rating !== null ? `${media.tmdb_rating.toFixed(1)} TMDB` : "UNRATED"}
        </span>
      </div>

      {/* =====================================================================
          3. INTERACTIVE POPOVER: Modern Apothecary State & Rating Picker
          ===================================================================== */}
      {isPopoverOpen && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-12 right-2 z-30 w-64 sm:w-72 border border-stone-300 rounded-md bg-stone-50 p-3.5 shadow-md shadow-stone-800/10 text-stone-900 select-text space-y-3"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <span className="font-serif text-xs font-semibold text-stone-800 truncate">
              {media.title}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPopoverOpen(false);
              }}
              className="text-xs font-mono text-stone-400 hover:text-stone-700 cursor-pointer px-1"
            >
              ✕
            </button>
          </div>

          {/* Watch Status Selector Chips (Styleguide 4) */}
          <div className="grid grid-cols-3 gap-1.5 w-full">
            {STATUS_OPTIONS.map((option) => {
              const isActive = status === option.value;
              const isOptionDisabled =
                media.media_type === "movie" && option.value === "watching";

              let chipStyle =
                "bg-stone-50 text-stone-600 border border-stone-300 hover:bg-stone-100 rounded-md transition-colors";

              if (isOptionDisabled) {
                chipStyle =
                  "bg-stone-100 text-stone-400 line-through cursor-not-allowed border border-stone-200 rounded-md opacity-50";
              } else if (isActive) {
                if (option.value === "want_to_watch") {
                  chipStyle =
                    "bg-orange-700 text-white border-transparent font-medium rounded-md shadow-sm";
                } else if (option.value === "watching") {
                  chipStyle =
                    "bg-stone-800 text-white border-transparent font-medium rounded-md shadow-sm";
                } else if (option.value === "watched") {
                  chipStyle =
                    "bg-emerald-800 text-white border-transparent font-medium rounded-md shadow-sm";
                }
              }

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    !isOptionDisabled && handleStatusChange(option.value)
                  }
                  disabled={isPending || isOptionDisabled}
                  className={`h-8 px-1 text-xs font-medium uppercase flex items-center justify-center truncate cursor-pointer transition-colors ${chipStyle}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* 10-Star Rating Picker */}
          <div className="space-y-1.5 pt-1.5 border-t border-stone-200">
            <span className="block text-[10px] font-mono font-medium uppercase text-stone-500">
              RATE (1 TO 10):
            </span>
            <div
              className="flex items-center justify-between gap-1 w-full"
              onMouseLeave={() => setHoverRating(null)}
            >
              <div className="flex items-center justify-between flex-1 min-w-0 pr-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starVal) => {
                  const isHovering = hoverRating !== null;
                  const isFilledHover = isHovering && starVal <= hoverRating;
                  const isFilledSaved =
                    !isHovering && rating !== null && starVal <= rating;

                  const starClass = isFilledSaved
                    ? "fill-stone-900 stroke-stone-900"
                    : isFilledHover
                    ? "fill-stone-400 stroke-stone-800 stroke-[1.5]"
                    : "fill-none stroke-stone-400 stroke-[1.5]";

                  return (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => {
                        handleRatingClick(starVal);
                        setHoverRating(null);
                      }}
                      onMouseEnter={() => setHoverRating(starVal)}
                      disabled={isPending}
                      className="p-0.5 cursor-pointer text-stone-800 hover:scale-120 transition-transform flex items-center justify-center"
                    >
                      <svg
                        className={`w-4 h-4 transition-colors ${starClass}`}
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

              <button
                type="button"
                onClick={handleClearRating}
                disabled={isPending || rating === null}
                className={`px-1.5 py-0.5 text-xs font-mono shrink-0 ${
                  rating !== null
                    ? "text-stone-500 hover:text-stone-900 cursor-pointer"
                    : "text-stone-300 cursor-not-allowed select-none"
                }`}
                title="Clear rating"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
