"use client";

import React, { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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

interface MediaDetailViewProps {
  initialMedia: MergedMediaItem;
  dataSource: "supabase" | "wireframe-store";
}

const STATUS_OPTIONS: Array<{ value: MediaStatus; label: string }> = [
  { value: "want_to_watch", label: "WANT TO WATCH" },
  { value: "watching", label: "WATCHING" },
  { value: "watched", label: "WATCHED & RATED" },
];

export default function MediaDetailView({
  initialMedia,
}: MediaDetailViewProps) {
  const router = useRouter();
  const [media, setMedia] = useState<MergedMediaItem>(initialMedia);
  const [status, setStatus] = useState<MediaStatus | null>(initialMedia.status);
  const [rating, setRating] = useState<number | null>(initialMedia.rating);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [seasons, setSeasons] = useState<SeasonWireframeGroup[]>(
    initialMedia.seasons ?? []
  );
  const [activeSeasonNumber, setActiveSeasonNumber] = useState<number>(
    initialMedia.seasons?.[0]?.season_number ?? 1
  );
  const [isPending, startTransition] = useTransition();

  const handleExit = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/?view=library");
    }
  }, [router]);

  // Handle Escape key to return to library
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleExit();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExit]);

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

    setMedia((prev) => ({
      ...prev,
      status: nextStatus,
      rating: nextRating,
      updated_at: new Date().toISOString(),
    }));

    startTransition(async () => {
      try {
        const result = await upsertUserMediaAction({
          tmdb_id: media.tmdb_id,
          title: media.title,
          media_type: media.media_type,
          poster_path: media.poster_path,
          backdrop_path: media.backdrop_path,
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

  const releaseInfo = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    if (media.media_type === "tv") {
      if (media.next_air_date) {
        const isUpcoming = media.next_air_date >= today;
        const episodeLabel = media.next_episode_label
          ? `NEXT: ${media.next_episode_label}`
          : "NEXT EPISODE";
        return {
          date: isUpcoming ? media.next_air_date : media.next_air_date.slice(0, 4),
          label: episodeLabel,
          isUpcoming,
        };
      }
      if (media.release_date) {
        const isUpcoming = media.release_date >= today;
        return {
          date: isUpcoming ? media.release_date : media.release_date.slice(0, 4),
          label: isUpcoming ? "SERIES PREMIERE" : "PREMIERED",
          isUpcoming,
        };
      }
      return null;
    }

    if (media.release_date) {
      const isUpcoming = media.release_date >= today;
      return {
        date: isUpcoming ? media.release_date : media.release_date.slice(0, 4),
        label: isUpcoming ? "IN THEATERS" : "THEATRICAL RELEASE",
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

  const year =
    (media.release_date || media.next_air_date || "").slice(0, 4) || "—";

  const backdropUrl = media.backdrop_path
    ? `https://image.tmdb.org/t/p/original${media.backdrop_path}`
    : media.poster_path
    ? `https://image.tmdb.org/t/p/original${media.poster_path}`
    : null;

  const posterUrl = media.poster_path
    ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
    : null;

  return (
    <div className="min-h-screen bg-stone-100 -m-3 sm:-m-4 md:-m-6 text-stone-900">
      {/* =====================================================================
          1. CINEMATIC BACKDROP BANNER (Blueprint 5.2)
          ===================================================================== */}
      <div className="relative w-full h-[40vh] min-h-75 bg-stone-900 overflow-hidden">
        {/* Navigation Over Backdrop */}
        <div className="absolute top-4 left-6 right-6 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-stone-300">
            <Link
              href="/?view=library"
              className="hover:text-white transition-colors underline font-medium"
            >
              ← RETURN TO LIBRARY
            </Link>
            <span>/</span>
            <span className="text-white font-medium">
              {media.media_type === "tv" ? "TV SHOW DETAIL" : "MOVIE DETAIL"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleExit}
            aria-label="Exit detail page"
            title="Exit detail page (Esc)"
            className="h-9 px-4 bg-stone-50/90 text-stone-800 border border-stone-300 rounded-md shadow-sm hover:bg-stone-100 text-xs font-mono font-medium flex items-center gap-2 cursor-pointer backdrop-blur-sm transition-colors"
          >
            <span>✕</span>
            <span>EXIT</span>
          </button>
        </div>

        {/* Backdrop Image with mix-blend-overlay & 60% opacity */}
        {backdropUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdropUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
          />
        )}

        {/* Gradient Fade to Stone-100 Canvas */}
        <div className="absolute inset-0 bg-linear-to-t from-stone-100 via-stone-100/20 to-transparent pointer-events-none" />
      </div>

      {/* =====================================================================
          2. CONTENT CONTAINER (Pulled up to overlap backdrop transition)
          ===================================================================== */}
      <div className="max-w-6xl mx-auto px-6 -mt-32 relative z-10 flex flex-col md:flex-row gap-8 pb-16">
        {/* Left Column: Poster */}
        <div className="w-64 shrink-0">
          {posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt={media.title}
              className="w-full rounded-md border-4 border-stone-50 shadow-lg shadow-stone-900/20"
            />
          ) : (
            <div className="w-full aspect-2/3 rounded-md border-4 border-stone-50 bg-stone-200 flex flex-col items-center justify-center p-6 text-center text-stone-400 font-mono text-xs uppercase shadow-lg shadow-stone-900/20">
              NO POSTER ART
            </div>
          )}
        </div>

        {/* Right Column: Metadata & Controls */}
        <div className="flex-1 pt-4 md:pt-32">
          {/* Title */}
          <h1 className="font-serif text-5xl md:text-6xl font-bold text-stone-900 tracking-tight mb-2 text-balance leading-tight">
            {media.title}
          </h1>

          {/* Vintage Meta Strip */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-stone-600 mb-8">
            <span className="px-2 py-1 bg-stone-200 border border-stone-300 rounded font-medium">
              {year}
            </span>
            <span className="px-2 py-1 bg-stone-200 border border-stone-300 rounded font-medium">
              {media.media_type === "tv" ? "TV SERIES" : "FEATURE FILM"}
            </span>
            {media.tmdb_rating !== undefined && media.tmdb_rating !== null && (
              <span className="px-2 py-1 bg-stone-200 border border-stone-300 rounded font-medium flex items-center gap-1.5">
                <span className="text-amber-600">★</span>
                <span>{media.tmdb_rating.toFixed(1)} TMDB</span>
              </span>
            )}
            {releaseInfo && (
              <span className="font-medium text-stone-600">
                {releaseInfo.label}: {releaseInfo.date}
              </span>
            )}
          </div>

          {/* Tracking Protocol Panel */}
          <div className="bg-stone-50 border border-stone-300 rounded-md p-6 max-w-xl shadow-sm mb-8">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-4">
              <h4 className="font-mono text-[10px] text-stone-400 uppercase tracking-widest">
                Tracking Protocol
              </h4>
              <span className="font-mono text-[10px] uppercase text-stone-500">
                {status
                  ? `ACTIVE [${status.replace(/_/g, " ").toUpperCase()}]`
                  : "[UNTRACKED]"}
              </span>
            </div>

            {/* Toggle Group */}
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((option) => {
                const isActive = status === option.value;
                const isOptionDisabled =
                  media.media_type === "movie" && option.value === "watching";

                let buttonClass =
                  "bg-stone-50 text-stone-600 border border-stone-300 hover:bg-stone-100 rounded-md py-2 text-xs font-medium transition-colors";

                if (isOptionDisabled) {
                  buttonClass =
                    "bg-stone-100 text-stone-400 line-through cursor-not-allowed border border-stone-200 rounded-md py-2 text-xs font-medium opacity-50";
                } else if (isActive) {
                  if (option.value === "want_to_watch") {
                    buttonClass =
                      "bg-orange-700 text-white border-transparent font-medium rounded-md py-2 text-xs shadow-sm";
                  } else if (option.value === "watching") {
                    buttonClass =
                      "bg-stone-800 text-white border-transparent font-medium rounded-md py-2 text-xs shadow-sm";
                  } else if (option.value === "watched") {
                    buttonClass =
                      "bg-emerald-800 text-white border-transparent font-medium rounded-md py-2 text-xs shadow-sm";
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
                    className={`flex items-center justify-center cursor-pointer transition-colors ${buttonClass}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {/* 10-Star Rating Bar */}
            <div className="space-y-1.5 pt-4 mt-4 border-t border-stone-200">
              <div className="flex items-center justify-between text-xs font-mono uppercase text-stone-600">
                <span>
                  YOUR RATING: {rating !== null ? `${rating} / 10` : "UNRATED"}
                </span>
                {rating !== null && (
                  <button
                    type="button"
                    onClick={handleClearRating}
                    className="text-stone-500 hover:text-stone-900 cursor-pointer text-xs font-medium"
                  >
                    CLEAR RATING ✕
                  </button>
                )}
              </div>

              <div
                className="flex items-center justify-between gap-1 w-full pt-1"
                onMouseLeave={() => setHoverRating(null)}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starVal) => {
                  const isHovering = hoverRating !== null;
                  const isFilledHover = isHovering && starVal <= hoverRating;
                  const isFilledSaved =
                    !isHovering && rating !== null && starVal <= rating;

                  const starColorClass = isFilledSaved
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
                      title={`Rate ${starVal} / 10`}
                      className="p-1 cursor-pointer text-stone-800 hover:scale-120 transition-transform flex items-center justify-center flex-1"
                    >
                      <svg
                        className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${starColorClass}`}
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
          </div>

          {/* Synopsis */}
          <div className="max-w-3xl font-sans text-stone-700 leading-relaxed mb-8">
            <h4 className="font-mono text-[10px] text-stone-400 uppercase tracking-widest mb-2 border-b border-stone-200 pb-1">
              Synopsis
            </h4>
            <p className="text-base sm:text-lg leading-relaxed text-stone-800">
              {media.overview || "No detailed synopsis available for this title."}
            </p>
          </div>

          {/* Find Similar Action */}
          <div>
            <Link
              href={`/discover?type=${media.media_type}&seed=${media.tmdb_id}&decade=${getDecadeFromDate(media.release_date || media.next_air_date)}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 font-sans text-xs font-medium rounded-md shadow-sm transition-colors cursor-pointer"
            >
              <CompassIcon className="w-4 h-4 shrink-0" />
              <span>FIND SIMILAR TITLES IN DISCOVERY RADAR</span>
              <span>➔</span>
            </Link>
          </div>

          {/* TV Season & Episode Checklist */}
          {media.media_type === "tv" && seasons.length > 0 && (
            <div className="border border-stone-300 bg-stone-50 rounded-md shadow-sm mt-8 overflow-hidden max-w-3xl">
              <div className="border-b border-stone-300 px-4 py-3 bg-stone-100/70 flex items-center justify-between font-serif font-semibold text-stone-900">
                <span className="tracking-tight text-sm sm:text-base">
                  EPISODE PROGRESSION RADAR
                </span>
                <span className="font-mono text-xs bg-stone-200 border border-stone-300 rounded text-stone-700 px-2 py-0.5">
                  {watchedEpisodes} / {totalEpisodes} WATCHED
                </span>
              </div>

              {/* Season Selector Tabs */}
              <div className="flex flex-wrap border-b border-stone-200 bg-stone-100/40">
                {seasons.map((s) => {
                  const isCurrent = s.season_number === activeSeasonNumber;
                  return (
                    <button
                      key={s.season_number}
                      type="button"
                      onClick={() => setActiveSeasonNumber(s.season_number)}
                      className={`px-4 py-2 text-xs font-mono font-medium uppercase border-r border-stone-200 transition-colors cursor-pointer ${
                        isCurrent
                          ? "bg-stone-800 text-white"
                          : "bg-transparent text-stone-600 hover:bg-stone-200/50"
                      }`}
                    >
                      SEASON {s.season_number}
                    </button>
                  );
                })}
              </div>

              {/* Episode Checklist */}
              <ul className="divide-y divide-stone-200 max-h-96 overflow-y-auto">
                {currentSeason?.episodes.map((ep) => (
                  <li
                    key={ep.tmdb_episode_id}
                    className="px-4 py-3 flex items-center justify-between gap-4 text-xs sm:text-sm hover:bg-stone-100/50 transition-colors"
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
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
                        className="h-4 w-4 accent-stone-800 rounded border-stone-300 cursor-pointer shrink-0"
                      />
                      <span
                        className={`truncate ${
                          ep.watched_boolean
                            ? "line-through text-stone-400 font-normal"
                            : "font-medium text-stone-900"
                        }`}
                      >
                        <strong className="font-mono">
                          E{String(ep.episode_number).padStart(2, "0")}:
                        </strong>{" "}
                        {ep.title}
                      </span>
                    </label>
                    <span className="text-xs text-stone-500 font-mono shrink-0 uppercase">
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
  );
}
