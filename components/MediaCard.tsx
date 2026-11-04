"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  fetchTvSeasonsAction,
  toggleEpisodeWatchedAction,
  upsertUserMediaAction,
} from "@/app/actions/media";
import { CompassIcon } from "@/components/Icons";
import {
  MediaStatus,
  MergedMediaItem,
  SeasonWireframeGroup,
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
  const [status, setStatus] = useState<MediaStatus | null>(media.status);
  const [rating, setRating] = useState<number | null>(media.rating);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [seasons, setSeasons] = useState<SeasonWireframeGroup[]>(
    media.seasons ?? []
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeSeasonNumber, setActiveSeasonNumber] = useState<number>(
    media.seasons?.[0]?.season_number ?? 1
  );
  const [hasLoadedLiveSeasons, setHasLoadedLiveSeasons] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Adjust state during render if props change (React pattern: avoids cascading renders)
  const [prevMediaKey, setPrevMediaKey] = useState(
    `${media.tmdb_id}-${media.status}-${media.rating}`
  );

  const currentMediaKey = `${media.tmdb_id}-${media.status}-${media.rating}`;
  if (prevMediaKey !== currentMediaKey) {
    setPrevMediaKey(currentMediaKey);
    setStatus(media.status);
    setRating(media.rating);
    setHoverRating(null);
    if (media.seasons && media.seasons.length > 0 && !hasLoadedLiveSeasons) {
      setSeasons(media.seasons);
    }
  }

  // Handle Escape key to dismiss modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsDetailModalOpen(false);
      }
    }
    if (isDetailModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDetailModalOpen]);

  function handleOpenModal() {
    setIsDetailModalOpen(true);
    if (media.media_type === "tv" && !hasLoadedLiveSeasons) {
      startTransition(async () => {
        const fetched = await fetchTvSeasonsAction(media.tmdb_id);
        if (fetched.length > 0) {
          setSeasons(fetched);
          setActiveSeasonNumber(fetched[0].season_number);
          setHasLoadedLiveSeasons(true);
        }
      });
    }
  }

  // Centralized optimistic state mutation + server action dispatcher
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
      seasons,
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
    // Pure toggle: clicking the currently active status toggles it off (untracks / removes from library)
    const nextStatus: MediaStatus | null =
      status === clickedStatus ? null : clickedStatus;
    const nextRating = nextStatus === null ? null : rating;
    mutateUserMedia(nextStatus, nextRating);
  }

  function handleRatingClick(starValue: number) {
    if (rating === starValue) return;

    // Status transition rules:
    // 1. If currently 'watching', rating changes keep 'watching'
    // 2. If setting a rating from untracked (null) or 'want_to_watch', promote to 'watched'
    // 3. If currently 'watched', keep 'watched'
    const effectiveStatus: MediaStatus =
      status === "watching" ? "watching" : "watched";

    mutateUserMedia(effectiveStatus, starValue);
  }

  function handleClearRating() {
    if (rating === null) return;
    mutateUserMedia(status, null);
  }

  function handleToggleEpisode(
    seasonNumber: number,
    episodeNumber: number,
    tmdbEpisodeId: number,
    checked: boolean
  ) {
    const watchDate = checked ? new Date().toISOString() : null;

    const updatedSeasons = seasons.map((season) => {
      if (season.season_number !== seasonNumber) return season;
      return {
        ...season,
        episodes: season.episodes.map((ep) =>
          ep.tmdb_episode_id === tmdbEpisodeId
            ? { ...ep, watched_boolean: checked, watch_date: watchDate }
            : ep
        ),
      };
    });

    setSeasons(updatedSeasons);

    const optimisticItem: MergedMediaItem = {
      ...media,
      status,
      rating,
      updated_at: new Date().toISOString(),
      seasons: updatedSeasons,
    };
    onStateChange?.(optimisticItem);

    startTransition(async () => {
      try {
        await toggleEpisodeWatchedAction({
          tmdb_id: media.tmdb_id,
          title: media.title,
          poster_path: media.poster_path,
          tmdb_episode_id: tmdbEpisodeId,
          season_number: seasonNumber,
          episode_number: episodeNumber,
          watched_boolean: checked,
        });
      } catch {
        // error handling
      }
    });
  }

  const totalEpisodes = seasons.reduce(
    (acc, s) => acc + s.episodes.length,
    0
  );
  const watchedEpisodes = seasons.reduce(
    (acc, s) => acc + s.episodes.filter((e) => e.watched_boolean).length,
    0
  );
  const currentSeason =
    seasons.find((s) => s.season_number === activeSeasonNumber) ?? seasons[0];

  const overviewText = media.overview?.trim() || "";

  // Dedicated Release / Next Episode Info computed from media metadata
  const releaseInfo = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    if (media.media_type === "tv") {
      if (media.next_air_date) {
        const isUpcoming = media.next_air_date >= today;
        const episodeLabel = media.next_episode_label
          ? `NEXT: ${media.next_episode_label}`
          : "NEXT EPISODE";
        const formattedDate = isUpcoming
          ? media.next_air_date
          : media.next_air_date.slice(0, 4);
        return {
          date: formattedDate,
          label: episodeLabel,
          isUpcoming,
        };
      }
      if (media.release_date) {
        const isUpcoming = media.release_date >= today;
        const formattedDate = isUpcoming
          ? media.release_date
          : media.release_date.slice(0, 4);
        return {
          date: formattedDate,
          label: isUpcoming ? "SERIES PREMIERE" : "PREMIERED",
          isUpcoming,
        };
      }
      return null;
    }

    // Movies
    if (media.release_date) {
      const isUpcoming = media.release_date >= today;
      const formattedDate = isUpcoming
        ? media.release_date
        : media.release_date.slice(0, 4);
      return {
        date: formattedDate,
        label: isUpcoming ? "IN THEATERS" : "RELEASED",
        isUpcoming,
      };
    }

    return null;
  }, [
    media.media_type,
    media.next_air_date,
    media.next_episode_label,
    media.release_date,
  ]);

  // Common Rating Star Bar Renderer
  function renderStarBar() {
    return (
      <div
        className="flex items-center justify-between gap-2 w-full"
        onMouseLeave={() => setHoverRating(null)}
        role="group"
        aria-label="Star rating 1 to 10"
      >
        <div className="flex items-center justify-between flex-1 min-w-0 pr-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starVal) => {
            const isHovering = hoverRating !== null;
            const isFilledHover = isHovering && starVal <= hoverRating;
            const isFilledSaved =
              !isHovering && rating !== null && starVal <= rating;

            const starColorClass = isFilledSaved
              ? "fill-black stroke-black"
              : isFilledHover
              ? "fill-neutral-400 stroke-black stroke-[1.8]"
              : "fill-none stroke-black stroke-[1.8]";

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
                title={`Rate ${starVal}/10`}
                aria-label={`Rate ${starVal} out of 10`}
                className="p-0.5 cursor-pointer text-black hover:scale-125 active:scale-95 transition-transform flex items-center justify-center"
              >
                <svg
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${starColorClass}`}
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

        {/* Clear Rating Button (Permanently present with safe padding) */}
        <button
          type="button"
          onClick={handleClearRating}
          disabled={isPending || rating === null}
          title={rating !== null ? "Clear rating" : undefined}
          aria-label="Clear rating"
          className={`px-1.5 py-0.5 text-xs font-bold transition-colors shrink-0 ${
            rating !== null
              ? "text-neutral-500 hover:text-black cursor-pointer"
              : "text-neutral-200 cursor-not-allowed select-none"
          }`}
        >
          ✕
        </button>
      </div>
    );
  }

  // Rounded Pill Chips for Watch Status (Full width 3-column grid)
  function renderStatusChips() {
    return (
      <div
        className="grid grid-cols-3 gap-1.5 w-full"
        role="group"
        aria-label="Watch status toggle group"
      >
        {STATUS_OPTIONS.map((option) => {
          const isActive = status === option.value;
          const isOptionDisabled =
            media.media_type === "movie" && option.value === "watching";

          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                !isOptionDisabled && handleStatusChange(option.value)
              }
              disabled={isPending || isOptionDisabled}
              aria-pressed={isActive}
              title={
                isOptionDisabled
                  ? "Only TV shows can be marked as watching"
                  : undefined
              }
              className={`h-7 sm:h-7.5 px-1 sm:px-2 text-[11px] sm:text-xs font-bold uppercase rounded-xs transition-colors flex items-center justify-center truncate ${
                isOptionDisabled
                  ? "bg-neutral-100 text-neutral-300 line-through cursor-not-allowed"
                  : isActive
                  ? "bg-black text-white cursor-pointer shadow-xs"
                  : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 cursor-pointer"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {/* =========================================================================
          MEDIA CARD (Option B: Vertical Theatrical Poster Card)
          ========================================================================= */}
      <article
        className="border-2 border-black bg-white text-black flex flex-col overflow-hidden w-full rounded-xs hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
        data-testid={`media-card-${media.tmdb_id}`}
      >
        {/* Top: 2:3 Theatrical Poster (Full Width, Maximized) */}
        <div
          onClick={handleOpenModal}
          className="w-full aspect-2/3 border-b-2 border-black bg-neutral-200 relative overflow-hidden flex flex-col justify-center cursor-pointer group"
          title="Click to view full details"
        >
          {media.poster_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
              alt={`${media.title} poster`}
              className="w-full h-full object-cover grayscale contrast-125 group-hover:scale-105 group-hover:grayscale-0 transition-all duration-200"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full p-4 text-center text-xs uppercase text-neutral-500 font-bold flex items-center justify-center">
              NO POSTER AVAILABLE
            </div>
          )}
        </div>

        {/* Bottom: 100% Width Content & Controls */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1 space-y-3 bg-white">
          <div className="space-y-1.5">
            {/* Header Strip: Media Type + Episode Progress (Left) & TMDB Rating (Right) */}
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-500">
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0">
                  {media.media_type === "tv" ? "TV SHOW" : "MOVIE"}
                </span>
                {media.media_type === "tv" && (
                  <button
                    type="button"
                    onClick={handleOpenModal}
                    className="text-black hover:underline cursor-pointer font-bold truncate text-[11px]"
                    title="Manage episodes"
                  >
                    [{watchedEpisodes}/{totalEpisodes} ➔]
                  </button>
                )}
              </div>

              {/* TMDB Community Score (Right-aligned) */}
              {media.tmdb_rating !== undefined && media.tmdb_rating !== null && (
                <span
                  className="font-extrabold text-neutral-900 shrink-0 flex items-center gap-1"
                  title="TMDB Community Score"
                >
                  <span className="text-amber-500 font-normal">★</span>
                  <span>{media.tmdb_rating.toFixed(1)}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">TMDB</span>
                </span>
              )}
            </div>

            {/* Title (Full Width, Large Typography) */}
            <div>
              <h3
                onClick={handleOpenModal}
                className="text-sm sm:text-base font-bold uppercase leading-tight hover:underline cursor-pointer truncate"
                title={media.title}
              >
                {media.title}
              </h3>
            </div>

            {/* Dedicated Release / Drop Info Line */}
            {releaseInfo && (
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide leading-none min-w-0">
                <svg
                  className="w-3.5 h-3.5 text-neutral-400 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="shrink-0 text-black font-extrabold">
                  {releaseInfo.date}
                </span>
                <span className="text-neutral-400 shrink-0">•</span>
                <span className="truncate text-neutral-600 font-bold">
                  {releaseInfo.label}
                </span>
              </p>
            )}

            {/* Synopsis Clamped to 2 lines with "...more" */}
            {overviewText ? (
              <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed pt-0.5">
                {overviewText}{" "}
                <button
                  type="button"
                  onClick={handleOpenModal}
                  className="text-black font-bold hover:underline cursor-pointer ml-0.5 inline"
                >
                  ...more
                </button>
              </p>
            ) : (
              <p className="text-xs text-neutral-400 italic pt-0.5">
                No synopsis available.
              </p>
            )}
          </div>

          {/* Bottom Actions: Full-width Status Chips + (Rate Button / Find Similar) */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            {/* Full-width 3-column Status Chips */}
            {renderStatusChips()}

            {/* Action Row: Rate Button (opens full 10-star picker in modal) & FIND SIMILAR */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenModal}
                className={`h-7 px-2.5 flex items-center justify-center gap-1 border border-black text-xs font-bold uppercase rounded-xs transition-colors cursor-pointer shrink-0 ${
                  rating !== null
                    ? "bg-black text-white hover:bg-neutral-800"
                    : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                }`}
                title={
                  rating !== null
                    ? `Your rating: ${rating}/10 (Click to change)`
                    : "Click to rate 1 to 10"
                }
              >
                <span className="text-[11px]">★</span>
                <span>{rating !== null ? `${rating}/10` : "RATE"}</span>
              </button>

              <Link
                href={`/discover?type=${media.media_type}&seed=${media.tmdb_id}&decade=${getDecadeFromDate(media.release_date || media.next_air_date)}`}
                className="h-7 px-2 flex-1 flex items-center justify-center gap-1.5 border border-black bg-neutral-100 hover:bg-black hover:text-white text-xs font-bold uppercase rounded-xs transition-colors cursor-pointer min-w-0"
                title={`Find titles similar to ${media.title}`}
              >
                <CompassIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">FIND SIMILAR</span>
                <span className="text-[11px] font-mono shrink-0">➔</span>
              </Link>
            </div>
          </div>
        </div>
      </article>

      {/* =========================================================================
          UNIFIED DETAIL & EPISODE MODAL
          ========================================================================= */}
      {isDetailModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setIsDetailModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`modal-title-${media.tmdb_id}`}
        >
          <div
            className="bg-white border-4 border-black text-black w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Body: Single Unified Detail Card */}
            <div className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1">
              {/* Media Overview Card Block */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Poster */}
                <div className="w-32 sm:w-44 shrink-0 aspect-2/3 border-2 border-black bg-neutral-200 overflow-hidden self-start">
                  {media.poster_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                      alt={media.title}
                      className="w-full h-full object-cover grayscale contrast-125 hover:grayscale-0 transition-all duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold uppercase text-neutral-500">
                      NO POSTER
                    </div>
                  )}
                </div>

                {/* Info & Live Controls */}
                <div className="flex-1 flex flex-col justify-between space-y-3 min-w-0">
                  <div>
                    {/* Top Row: Type + TMDB Badges (Left) & X Close Button (Right) */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-200">
                      <div className="flex items-center gap-2">
                        <span className="border-2 border-black bg-white px-2 py-0.5 text-xs font-bold uppercase shrink-0">
                          {media.media_type === "tv" ? "TV SHOW" : "MOVIE"}
                        </span>
                        {media.tmdb_rating !== undefined && media.tmdb_rating !== null && (
                          <span className="border-2 border-black bg-white px-2 py-0.5 text-xs font-bold uppercase shrink-0 flex items-center gap-1 font-mono">
                            <span className="text-amber-500 font-normal">★</span>
                            <span>{media.tmdb_rating.toFixed(1)} TMDB</span>
                          </span>
                        )}
                      </div>

                      {/* Drop the X into the top right of DETAIL CARD */}
                      <button
                        type="button"
                        onClick={() => setIsDetailModalOpen(false)}
                        className="border-2 border-black bg-white hover:bg-black hover:text-white px-2.5 py-0.5 text-xs font-bold uppercase cursor-pointer shrink-0 transition-colors"
                        title="Close modal (Esc)"
                      >
                        ✕ CLOSE
                      </button>
                    </div>

                    {/* Single Title (Prominent & bold) */}
                    <h2
                      id={`modal-title-${media.tmdb_id}`}
                      className="text-base sm:text-lg font-bold uppercase leading-snug mt-2"
                    >
                      {media.title}
                    </h2>

                    {/* Release Date Line */}
                    {releaseInfo && (
                      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide leading-none mt-1.5 min-w-0">
                        <svg
                          className="w-3.5 h-3.5 text-neutral-400 shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span className="shrink-0 text-black font-extrabold">
                          {releaseInfo.date}
                        </span>
                        <span className="text-neutral-400 shrink-0">•</span>
                        <span className="truncate text-neutral-700 font-bold">
                          {releaseInfo.label}
                        </span>
                      </p>
                    )}

                    {/* Full Synopsis */}
                    <div className="mt-3 text-xs leading-relaxed text-neutral-800">
                      <span className="font-bold uppercase text-black block mb-0.5">
                        SYNOPSIS:
                      </span>
                      {overviewText || "No overview available for this title."}
                    </div>
                  </div>

                  {/* Status, Rating Bar & FIND SIMILAR inside Modal */}
                  <div className="space-y-2 pt-2 border-t-2 border-black">
                    <div>{renderStatusChips()}</div>
                    <div>{renderStarBar()}</div>
                    <div className="pt-0.5">
                      <Link
                        href={`/discover?type=${media.media_type}&seed=${media.tmdb_id}&decade=${getDecadeFromDate(media.release_date || media.next_air_date)}`}
                        onClick={() => setIsDetailModalOpen(false)}
                        className="w-full h-7 sm:h-8 flex items-center justify-center gap-2 border-2 border-black bg-neutral-100 hover:bg-black hover:text-white text-xs font-bold uppercase rounded-xs transition-colors cursor-pointer"
                        title={`Find titles similar to ${media.title}`}
                      >
                        <CompassIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>FIND SIMILAR TITLES</span>
                        <span>➔</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* TV Season & Episode Checklist Section */}
              {media.media_type === "tv" && (
                <div className="border-2 border-black bg-white">
                  <div className="border-b-2 border-black px-3 py-2 bg-neutral-100 flex items-center justify-between font-bold text-xs uppercase">
                    <span>EPISODE TRACKER</span>
                    <span>
                      [{watchedEpisodes}/{totalEpisodes} WATCHED]
                    </span>
                  </div>

                  {/* Season Selector Tabs */}
                  <div className="flex flex-wrap border-b-2 border-black bg-neutral-100">
                    {seasons.map((s) => {
                      const isCurrent = s.season_number === activeSeasonNumber;
                      return (
                        <button
                          key={s.season_number}
                          type="button"
                          onClick={() => setActiveSeasonNumber(s.season_number)}
                          className={`px-3 py-1.5 text-xs font-bold uppercase border-r-2 border-black cursor-pointer ${
                            isCurrent
                              ? "bg-black text-white"
                              : "bg-white text-black hover:bg-neutral-200"
                          }`}
                        >
                          SEASON {s.season_number}
                        </button>
                      );
                    })}
                  </div>

                  {/* Episode Checklist */}
                  <ul className="divide-y-2 border-black max-h-64 overflow-y-auto">
                    {currentSeason?.episodes.map((ep) => (
                      <li
                        key={ep.tmdb_episode_id}
                        className="px-3 py-2 flex items-center justify-between gap-3 text-xs hover:bg-neutral-50"
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={ep.watched_boolean}
                            onChange={(e) =>
                              handleToggleEpisode(
                                ep.season_number,
                                ep.episode_number,
                                ep.tmdb_episode_id,
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 accent-black border-2 border-black cursor-pointer shrink-0"
                          />
                          <span
                            className={`truncate ${
                              ep.watched_boolean
                                ? "line-through text-neutral-400"
                                : "font-medium"
                            }`}
                          >
                            <strong>
                              E{String(ep.episode_number).padStart(2, "0")}:
                            </strong>{" "}
                            {ep.title}
                          </span>
                        </label>
                        <span className="text-[10px] text-neutral-500 font-mono shrink-0 uppercase">
                          {ep.watched_boolean && ep.watch_date
                            ? `WATCHED ${ep.watch_date.slice(0, 10)}`
                            : ep.air_date || "TBA"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
