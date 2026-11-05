"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  toggleEpisodeWatchedAction,
  toggleSeasonWatchedAction,
  upsertUserMediaAction,
} from "@/app/actions/media";
import { CompassIcon } from "@/components/Icons";
import { StatusToggleGroup } from "@/components/StatusToggle";
import {
  MediaDetailViewProps,
  MediaStatus,
  MergedMediaItem,
  SeasonWireframeGroup,
} from "@/types";
import { getDecadeFromDate } from "@/lib/utils";
import { buildDefaultSeasonsForTv } from "@/lib/supabase";

export default function MediaDetailView({
  initialMedia,
}: MediaDetailViewProps) {
  const router = useRouter();
  const [media, setMedia] = useState<MergedMediaItem>(initialMedia);
  const [status, setStatus] = useState<MediaStatus | null>(initialMedia.status);
  const [rating, setRating] = useState<number | null>(initialMedia.rating);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const initialSeasons = useMemo(() => {
    if (initialMedia.seasons && initialMedia.seasons.length > 0) {
      return initialMedia.seasons;
    }
    if (initialMedia.media_type === "tv") {
      return buildDefaultSeasonsForTv(initialMedia.tmdb_id, new Map());
    }
    return [];
  }, [initialMedia.seasons, initialMedia.media_type, initialMedia.tmdb_id]);

  const [seasons, setSeasons] =
    useState<SeasonWireframeGroup[]>(initialSeasons);
  const [activeSeasonNumber, setActiveSeasonNumber] = useState<number>(
    initialSeasons[0]?.season_number ?? 1,
  );
  const [isRadarModalOpen, setIsRadarModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Sync state if incoming initialMedia changes (e.g. client router push / revalidation)
  const [prevMediaKey, setPrevMediaKey] = useState(
    `${initialMedia.tmdb_id}-${initialMedia.media_type}-${initialMedia.status}-${initialMedia.rating}`,
  );
  const currentMediaKey = `${initialMedia.tmdb_id}-${initialMedia.media_type}-${initialMedia.status}-${initialMedia.rating}`;
  if (prevMediaKey !== currentMediaKey) {
    setPrevMediaKey(currentMediaKey);
    setMedia(initialMedia);
    setStatus(initialMedia.status);
    setRating(initialMedia.rating);
    const resolved =
      initialMedia.seasons && initialMedia.seasons.length > 0
        ? initialMedia.seasons
        : initialMedia.media_type === "tv"
          ? buildDefaultSeasonsForTv(initialMedia.tmdb_id, new Map())
          : [];
    setSeasons(resolved);
    setActiveSeasonNumber(resolved[0]?.season_number ?? 1);
  }

  const handleExit = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/?view=library");
    }
  }, [router]);

  // Handle Escape key: close radar modal first if open, else exit to library
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isRadarModalOpen) {
          setIsRadarModalOpen(false);
        } else {
          handleExit();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExit, isRadarModalOpen]);

  // Lock body scroll when radar modal is open
  useEffect(() => {
    if (isRadarModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isRadarModalOpen]);

  function mutateUserMedia(
    nextStatus: MediaStatus | null,
    nextRating: number | null,
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
    checked: boolean,
  ) {
    const watchDate = checked ? new Date().toISOString() : null;

    const updatedSeasons = seasons.map((season) => {
      if (season.season_number !== seasonNumber) return season;
      return {
        ...season,
        episodes: season.episodes.map((ep) =>
          ep.tmdb_episode_id === tmdbEpisodeId
            ? { ...ep, watched_boolean: checked, watch_date: watchDate }
            : ep,
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

  function handleToggleSeason(seasonNumber: number, targetChecked: boolean) {
    const watchDate = targetChecked ? new Date().toISOString() : null;
    const targetSeason = seasons.find((s) => s.season_number === seasonNumber);
    if (!targetSeason || targetSeason.episodes.length === 0) return;

    const updatedSeasons = seasons.map((season) => {
      if (season.season_number !== seasonNumber) return season;
      return {
        ...season,
        episodes: season.episodes.map((ep) => ({
          ...ep,
          watched_boolean: targetChecked,
          watch_date: watchDate,
        })),
      };
    });

    setSeasons(updatedSeasons);

    startTransition(async () => {
      try {
        await toggleSeasonWatchedAction({
          tmdb_id: media.tmdb_id,
          title: media.title,
          poster_path: media.poster_path,
          season_number: seasonNumber,
          episodes: targetSeason.episodes.map((ep) => ({
            tmdb_episode_id: ep.tmdb_episode_id,
            episode_number: ep.episode_number,
          })),
          watched_boolean: targetChecked,
        });
      } catch {
        // error handling
      }
    });
  }

  const totalEpisodes = seasons.reduce((acc, s) => acc + s.episodes.length, 0);
  const watchedEpisodes = seasons.reduce(
    (acc, s) => acc + s.episodes.filter((e) => e.watched_boolean).length,
    0,
  );
  const currentSeason =
    seasons.find((s) => s.season_number === activeSeasonNumber) ?? seasons[0];

  const releaseStatusInfo = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const dateStr = media.release_date || media.next_air_date || "";
    const isUpcoming = Boolean(dateStr && dateStr > today);
    const releaseYear = isUpcoming
      ? "UPCOMING"
      : dateStr
        ? dateStr.slice(0, 4)
        : "—";

    const typeLabel = media.media_type === "tv" ? "TV Show" : "Feature Film";

    return {
      releaseYear,
      isUpcoming,
      typeLabel,
    };
  }, [media.release_date, media.next_air_date, media.media_type]);

  const nextEpisodeDetails = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const totalSeasonsCount = media.number_of_seasons || seasons.length;

    // 1. Check if there is an upcoming live future broadcast scheduled
    const hasLiveFutureAirDate = Boolean(
      media.next_air_date && media.next_air_date >= today,
    );
    const hasLiveFutureNextEpisode = Boolean(
      media.next_episode_to_air?.air_date &&
      media.next_episode_to_air.air_date >= today,
    );

    if (hasLiveFutureAirDate || hasLiveFutureNextEpisode) {
      const airDateStr =
        media.next_air_date || media.next_episode_to_air?.air_date || "";
      const epLabel =
        media.next_episode_label ||
        (media.next_episode_to_air
          ? `S${String(media.next_episode_to_air.season_number).padStart(2, "0")}E${String(media.next_episode_to_air.episode_number).padStart(2, "0")} — ${media.next_episode_to_air.name || "TBA"}`
          : "Next episode scheduled");

      return {
        badge: "NEXT BROADCAST",
        badgeColor: "bg-emerald-500",
        pulse: true,
        label: `AIRING ${airDateStr}`,
        description: epLabel,
      };
    }

    // 2. Check for next unwatched episode across all seasons in user progression
    let nextUnwatched: {
      season_number: number;
      episode_number: number;
      title: string;
      air_date: string | null;
    } | null = null;

    for (const s of seasons) {
      for (const ep of s.episodes) {
        if (!ep.watched_boolean) {
          nextUnwatched = {
            season_number: s.season_number,
            episode_number: ep.episode_number,
            title: ep.title,
            air_date: ep.air_date,
          };
          break;
        }
      }
      if (nextUnwatched) break;
    }

    if (nextUnwatched) {
      const airNote = nextUnwatched.air_date
        ? ` • Aired ${nextUnwatched.air_date}`
        : "";
      return {
        badge: "NEXT UP TO WATCH",
        badgeColor: "bg-emerald-500",
        pulse: true,
        label: `SEASON ${nextUnwatched.season_number} OF ${totalSeasonsCount}`,
        description: `S${String(nextUnwatched.season_number).padStart(2, "0")}E${String(nextUnwatched.episode_number).padStart(2, "0")} — ${nextUnwatched.title}${airNote}`,
      };
    }

    // 3. All seasons and episodes watched by the user
    if (totalEpisodes > 0 && watchedEpisodes === totalEpisodes) {
      const isEnded =
        media.series_status === "Ended" || media.series_status === "Canceled";
      if (isEnded) {
        return {
          badge: "SERIES COMPLETED",
          badgeColor: "bg-zinc-400",
          pulse: false,
          label: `ALL ${totalSeasonsCount} SEASONS COMPLETE`,
          description: `All ${totalEpisodes} episodes watched • Series finale has aired`,
        };
      }
      return {
        badge: "UP TO DATE",
        badgeColor: "bg-emerald-500",
        pulse: false,
        label: `ALL ${totalSeasonsCount} SEASONS WATCHED`,
        description: `All ${totalEpisodes} episodes watched • Season ${totalSeasonsCount + 1} awaiting air date`,
      };
    }

    // 4. Series has finished airing (no future broadcast scheduled)
    if (media.series_status === "Ended" || media.series_status === "Canceled") {
      return {
        badge: "SERIES CONCLUDED",
        badgeColor: "bg-zinc-400",
        pulse: false,
        label: `${totalSeasonsCount} SEASONS AIRED`,
        description: media.last_episode_to_air
          ? `Series Finale: S${String(media.last_episode_to_air.season_number).padStart(2, "0")}E${String(media.last_episode_to_air.episode_number).padStart(2, "0")} — ${media.last_episode_to_air.name || "Finale"} (${media.last_episode_to_air.air_date || ""})`
          : `All ${totalSeasonsCount} seasons concluded`,
      };
    }

    return {
      badge: "SERIES RADAR",
      badgeColor: "bg-zinc-400",
      pulse: false,
      label: `${totalSeasonsCount} SEASONS AIRED`,
      description: `Season ${totalSeasonsCount + 1} awaiting air date announcement`,
    };
  }, [
    media.next_air_date,
    media.next_episode_label,
    media.next_episode_to_air,
    media.last_episode_to_air,
    media.number_of_seasons,
    media.series_status,
    seasons,
    totalEpisodes,
    watchedEpisodes,
  ]);

  const backdropUrl = media.backdrop_path
    ? `https://image.tmdb.org/t/p/original${media.backdrop_path}`
    : media.poster_path
      ? `https://image.tmdb.org/t/p/original${media.poster_path}`
      : null;

  const posterUrl = media.poster_path
    ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
    : null;

  return (
    <div className="min-h-screen bg-[#F4F3F0] -m-3 sm:-m-4 md:-m-6 text-zinc-800">
      {/* =====================================================================
          1. CINEMATIC BACKDROP BANNER
          ===================================================================== */}
      <div className="relative w-full h-[40vh] min-h-75 bg-zinc-950 overflow-hidden">
        {/* Top-Right Exit Button */}
        <div className="absolute top-4 right-6 z-20">
          <button
            type="button"
            onClick={handleExit}
            aria-label="Exit detail page"
            title="Exit detail page (Esc)"
            className="h-10 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl shadow-md text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all"
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

        {/* Gradient Fade to Warm Stone Canvas */}
        <div className="absolute inset-0 bg-linear-to-t from-[#F4F3F0] via-[#F4F3F0]/20 to-transparent pointer-events-none" />
      </div>

      {/* =====================================================================
          2. CONTENT CONTAINER (Poster & Text start at the exact same vertical line)
          ===================================================================== */}
      <div className="max-w-6xl mx-auto px-6 -mt-32 relative z-10 flex flex-col md:flex-row gap-8 lg:gap-12 pb-16">
        {/* Left Column: Enlarged Poster with 1px Grey Border */}
        <div className="w-72 sm:w-80 md:w-88 lg:w-96 shrink-0">
          {posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt={media.title}
              className="w-full aspect-2/3 object-cover rounded-2xl border border-zinc-400/90 shadow-2xl shadow-zinc-950/20"
            />
          ) : (
            <div className="w-full aspect-2/3 rounded-2xl border border-zinc-400/90 bg-zinc-200 flex flex-col items-center justify-center p-6 text-center text-zinc-500 font-mono text-sm uppercase shadow-2xl shadow-zinc-950/20">
              NO POSTER ART
            </div>
          )}
        </div>

        {/* Right Column: Starts at the same vertical offset as the poster */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-zinc-950 tracking-tight mb-4 text-balance leading-none">
            {media.title}
          </h1>

          {/* Under Title Metadata: Release Year/UPCOMING • Feature Film/TV Show • Rating */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-sm sm:text-base md:text-lg text-zinc-800 mb-6 font-bold">
            <span
              className={
                releaseStatusInfo.isUpcoming
                  ? "text-[#FF7A50] font-black"
                  : "text-zinc-950 font-black"
              }
            >
              {releaseStatusInfo.releaseYear}
            </span>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-800 font-bold">
              {releaseStatusInfo.typeLabel}
            </span>
            {media.tmdb_rating !== undefined && media.tmdb_rating !== null && (
              <>
                <span className="text-zinc-400">•</span>
                <span className="flex items-center gap-1.5 text-zinc-950 font-black">
                  <span className="text-amber-500 text-lg sm:text-xl">★</span>
                  <span>{media.tmdb_rating.toFixed(1)} TMDB</span>
                </span>
              </>
            )}
          </div>

          {/* Status Toggle Group */}
          <div className="flex items-center gap-3 mb-4">
            <StatusToggleGroup
              status={status}
              mediaType={media.media_type}
              onChange={handleStatusChange}
              disabled={isPending}
            />
          </div>

          {/* 10-Star Rating Picker */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="flex items-center gap-1.5 sm:gap-2"
              onMouseLeave={() => setHoverRating(null)}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starVal) => {
                const isHovering = hoverRating !== null;
                const isFilledHover = isHovering && starVal <= hoverRating;
                const isFilledSaved =
                  !isHovering && rating !== null && starVal <= rating;

                const starColorClass = isFilledSaved
                  ? "fill-amber-500 stroke-amber-600"
                  : isFilledHover
                    ? "fill-amber-300 stroke-amber-500"
                    : "fill-zinc-200 stroke-zinc-400 stroke-[1.6]";

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
                    className="p-1 cursor-pointer text-zinc-950 hover:scale-130 transition-transform flex items-center justify-center"
                  >
                    <svg
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${starColorClass}`}
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

            {rating !== null && (
              <button
                type="button"
                onClick={handleClearRating}
                className="ml-3 text-xs sm:text-sm font-mono font-medium uppercase text-zinc-600 hover:text-zinc-950 rounded-xl px-3 py-1.5 bg-[#F4F3F0] hover:bg-zinc-200 transition-colors cursor-pointer shrink-0"
                title="Clear rating"
              >
                CLEAR ✕
              </button>
            )}
          </div>

          {/* Overview Prose */}
          <div className="max-w-3xl mb-6">
            <p className="font-sans text-base sm:text-lg md:text-xl leading-relaxed text-zinc-800 font-normal">
              {media.overview ||
                "No detailed synopsis available for this title."}
            </p>
          </div>

          {/* TV Next Episode Broadcast Ticker & Radar Trigger (Option A) */}
          {(media.media_type === "tv" || seasons.length > 0) && (
            <div className="max-w-3xl mb-8 p-2 sm:p-5 bg-white rounded-2xl border border-zinc-400/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#F4F3F0] flex items-center justify-center shrink-0 border border-zinc-200">
                  <svg
                    className="w-5 h-5 text-zinc-700"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
                    <polyline points="17 2 12 7 7 2" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${nextEpisodeDetails.badgeColor} ${
                        nextEpisodeDetails.pulse ? "animate-pulse" : ""
                      }`}
                    />
                    <span className="font-extrabold text-zinc-800">
                      {nextEpisodeDetails.badge}
                    </span>
                    <span className="text-zinc-400">•</span>
                    <span className="text-zinc-600 font-semibold">
                      {nextEpisodeDetails.label}
                    </span>
                  </span>
                  <span className="font-sans text-sm sm:text-base font-bold text-zinc-950 truncate mt-0.5">
                    {nextEpisodeDetails.description}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRadarModalOpen(true)}
                className="px-4.5 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-sm uppercase tracking-wider font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-98"
                title="Open Episode Progression Radar"
              >
                <span>EPISODE RADAR</span>
                <span className="bg-zinc-700/80 px-2 py-0.5 rounded-md text-[11px] font-mono text-zinc-200">
                  {watchedEpisodes}/{totalEpisodes}
                </span>
                <span>↗</span>
              </button>
            </div>
          )}

          {/* Find Similar Action */}
          <div>
            <Link
              href={`/discover?type=${media.media_type}&seed=${media.tmdb_id}&decade=${getDecadeFromDate(media.release_date || media.next_air_date)}`}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-sm sm:text-base uppercase tracking-wider font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
            >
              <CompassIcon className="w-5 h-5 shrink-0 stroke-[2.2]" />
              <span>FIND SIMILAR TITLES</span>
            </Link>
          </div>

          {/* EPISODE PROGRESSION RADAR MODAL */}
          {isRadarModalOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
              onClick={() => setIsRadarModalOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="radar-modal-title"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl border border-zinc-400/90 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="border-b border-zinc-200 px-6 py-4.5 bg-[#F4F3F0] flex items-center justify-between font-sans shrink-0">
                  <div className="flex items-center gap-3">
                    <span
                      id="radar-modal-title"
                      className="tracking-tight text-lg sm:text-xl font-black text-zinc-950"
                    >
                      EPISODE PROGRESSION RADAR
                    </span>
                    <span className="font-mono text-xs sm:text-sm bg-[#34D399] text-emerald-950 rounded-xl font-black px-3 py-1 shadow-sm">
                      {watchedEpisodes} / {totalEpisodes} WATCHED
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsRadarModalOpen(false)}
                    className="w-8 h-8 rounded-xl bg-white hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 flex items-center justify-center font-mono font-bold text-sm transition-colors cursor-pointer"
                    aria-label="Close episode guide modal"
                    title="Close (Esc)"
                  >
                    ✕
                  </button>
                </div>

                {/* Season Selector Tabs */}
                <div className="flex flex-wrap border-b border-zinc-200 bg-[#F4F3F0] p-2 gap-1.5 shrink-0 max-h-40 overflow-y-auto">
                  {seasons.map((s) => {
                    const isCurrent = s.season_number === activeSeasonNumber;
                    const seasonTotal = s.episodes.length;
                    const seasonWatched = s.episodes.filter(
                      (e) => e.watched_boolean,
                    ).length;
                    const isAllWatched =
                      seasonTotal > 0 && seasonWatched === seasonTotal;
                    const isPartiallyWatched =
                      seasonWatched > 0 && seasonWatched < seasonTotal;

                    return (
                      <button
                        key={s.season_number}
                        type="button"
                        onClick={() => setActiveSeasonNumber(s.season_number)}
                        className={`shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-mono uppercase rounded-lg transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-zinc-800 hover:bg-zinc-700 text-white font-bold shadow-sm"
                            : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 font-medium"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAllWatched}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = isPartiallyWatched;
                            }
                          }}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleSeason(s.season_number, !isAllWatched);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Mark all Season ${s.season_number} episodes as watched`}
                          title={
                            isAllWatched
                              ? `Season ${s.season_number} complete (${seasonWatched}/${seasonTotal}). Click to mark unwatched.`
                              : isPartiallyWatched
                                ? `Season ${s.season_number} in progress (${seasonWatched}/${seasonTotal}). Click to mark all watched.`
                                : `Mark all Season ${s.season_number} episodes as watched (0/${seasonTotal}).`
                          }
                          className="h-4 w-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                        />
                        <span>SEASON {s.season_number}</span>
                        <span
                          className={`text-xs font-mono font-medium ${
                            isCurrent ? "text-zinc-300" : "text-zinc-500"
                          }`}
                        >
                          ({seasonWatched}/{seasonTotal})
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Episode Checklist */}
                <ul className="divide-y divide-zinc-200/80 flex-1 overflow-y-auto min-h-60">
                  {currentSeason?.episodes.map((ep) => (
                    <li
                      key={ep.tmdb_episode_id}
                      className="px-6 py-4 flex items-center justify-between gap-4 text-sm sm:text-base hover:bg-[#F4F3F0] transition-colors"
                    >
                      <label className="flex items-center gap-4 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={ep.watched_boolean}
                          onChange={(e) =>
                            handleToggleEpisode(
                              ep.season_number,
                              ep.episode_number,
                              ep.tmdb_episode_id,
                              e.target.checked,
                            )
                          }
                          className="h-5.5 w-5.5 accent-emerald-500 rounded cursor-pointer shrink-0"
                        />
                        <span
                          className={`truncate ${
                            ep.watched_boolean
                              ? "line-through text-zinc-400 font-normal"
                              : "font-bold text-zinc-950"
                          }`}
                        >
                          <strong className="font-mono font-black text-zinc-900">
                            E{String(ep.episode_number).padStart(2, "0")}:
                          </strong>{" "}
                          {ep.title}
                        </span>
                      </label>
                      <span className="text-xs sm:text-sm text-zinc-700 font-mono shrink-0 uppercase font-bold">
                        {ep.watched_boolean && ep.watch_date
                          ? `WATCHED ${ep.watch_date.slice(0, 10)}`
                          : ep.air_date || "TBA"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
