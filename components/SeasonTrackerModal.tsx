"use client";

import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  batchToggleAllEpisodesAction,
  fetchTvSeasonsAction,
  toggleEpisodeWatchedAction,
  upsertUserMediaAction,
} from "@/app/actions/media";
import LoadingSpinner from "@/components/LoadingSpinner";
import { calculateNextStatusFromEpisodes } from "@/lib/utils";
import {
  MediaStatus,
  SeasonTrackerModalProps,
  SeasonWireframeGroup,
} from "@/types";

export type { SeasonTrackerModalProps };
export { calculateNextStatusFromEpisodes };

export function isSyntheticSeasons(
  groups?: SeasonWireframeGroup[],
): boolean {
  if (!groups || groups.length === 0) return false;
  const firstEp = groups[0]?.episodes?.[0];
  if (!firstEp) return false;
  return Boolean(
    firstEp.air_date === "2024-01-10" ||
      (groups.length === 2 &&
        firstEp.title === "Episode 1" &&
        groups[0]?.episodes?.[1]?.title === "Episode 2" &&
        groups[1]?.episodes?.[0]?.air_date?.startsWith("2026-11-0")),
  );
}

export default function SeasonTrackerModal({
  isOpen,
  onClose,
  media,
  initialStatus,
  initialRating,
  onStateChange,
}: SeasonTrackerModalProps) {
  const isProvidedSynthetic = isSyntheticSeasons(media.seasons);
  const initialSeasonsList =
    media.seasons && media.seasons.length > 0 && !isProvidedSynthetic
      ? media.seasons
      : [];

  const [seasons, setSeasons] =
    useState<SeasonWireframeGroup[]>(initialSeasonsList);
  const [status, setStatus] = useState<MediaStatus | null>(initialStatus);
  const [rating, setRating] = useState<number | null>(initialRating);
  const [savedRating] = useState<number | null>(initialRating);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);
  const [activeSeasonNumber, setActiveSeasonNumber] = useState<number>(1);
  const [isPending, startTransition] = useTransition();

  const onStateChangeRef = useRef(onStateChange);
  const statusRef = useRef(status);
  const ratingRef = useRef(rating);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
    statusRef.current = status;
    ratingRef.current = rating;
  });

  // Load TV seasons from server if not already provided or if provided seasons were synthetic placeholders
  useEffect(() => {
    let isCancelled = false;
    async function loadSeasons() {
      if (seasons.length > 0 && !isSyntheticSeasons(seasons)) {
        setActiveSeasonNumber(seasons[0]?.season_number ?? 1);
        return;
      }
      setIsLoadingSeasons(true);
      try {
        const fetched = await fetchTvSeasonsAction(media.tmdb_id);
        if (!isCancelled && fetched.length > 0) {
          setSeasons(fetched);
          setActiveSeasonNumber(fetched[0]?.season_number ?? 1);
          onStateChangeRef.current?.({
            status: statusRef.current,
            rating: ratingRef.current,
            seasons: fetched,
          });
        }
      } catch {
        // Fallback
      } finally {
        if (!isCancelled) {
          setIsLoadingSeasons(false);
        }
      }
    }

    if (isOpen) {
      loadSeasons();
    }
    return () => {
      isCancelled = true;
    };
  }, [isOpen, media.tmdb_id, seasons]);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose],
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  const totalEpisodes = seasons.reduce((acc, s) => acc + s.episodes.length, 0);
  const watchedEpisodes = seasons.reduce(
    (acc, s) => acc + s.episodes.filter((e) => e.watched_boolean).length,
    0,
  );

  const modalBadgeClass =
    totalEpisodes > 0 && watchedEpisodes === totalEpisodes
      ? "bg-mint text-emerald-950 font-black ring-1 ring-emerald-500/30"
      : watchedEpisodes > 0
        ? "bg-periwinkle text-indigo-950 font-black ring-1 ring-indigo-500/30"
        : "bg-zinc-800 text-zinc-400 font-bold border border-zinc-700";

  const currentSeason =
    seasons.find((s) => s.season_number === activeSeasonNumber) || seasons[0];

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

    const nextStatus = calculateNextStatusFromEpisodes(
      updatedSeasons,
      status,
      media.series_status,
    );
    const shouldUpdateStatus = nextStatus !== status;
    const isNextEligible =
      nextStatus === "watching" || nextStatus === "watched";
    const nextRating = isNextEligible ? (rating ?? savedRating) : null;

    if (shouldUpdateStatus) {
      setStatus(nextStatus);
      setRating(nextRating);
    }

    onStateChange?.({
      status: nextStatus,
      rating: nextRating,
      seasons: updatedSeasons,
    });

    startTransition(async () => {
      try {
        const promises: Promise<unknown>[] = [
          toggleEpisodeWatchedAction({
            tmdb_id: media.tmdb_id,
            title: media.title,
            poster_path: media.poster_path,
            tmdb_episode_id: tmdbEpisodeId,
            season_number: seasonNumber,
            episode_number: episodeNumber,
            watched_boolean: checked,
          }),
        ];

        if (shouldUpdateStatus) {
          promises.push(
            upsertUserMediaAction({
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
              tmdb_rating: media.tmdb_rating ?? null,
            }),
          );
        }

        await Promise.all(promises);
      } catch {
        // Error handling
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

    const nextStatus = calculateNextStatusFromEpisodes(
      updatedSeasons,
      status,
      media.series_status,
    );
    const shouldUpdateStatus = nextStatus !== status;
    const isNextEligible =
      nextStatus === "watching" || nextStatus === "watched";
    const nextRating = isNextEligible ? (rating ?? savedRating) : null;

    if (shouldUpdateStatus) {
      setStatus(nextStatus);
      setRating(nextRating);
    }

    onStateChange?.({
      status: nextStatus,
      rating: nextRating,
      seasons: updatedSeasons,
    });

    const episodesToUpdate = targetSeason.episodes.map((ep) => ({
      tmdb_episode_id: ep.tmdb_episode_id,
      season_number: ep.season_number,
      episode_number: ep.episode_number,
    }));

    startTransition(async () => {
      try {
        const promises: Promise<unknown>[] = [
          batchToggleAllEpisodesAction({
            tmdb_id: media.tmdb_id,
            title: media.title,
            poster_path: media.poster_path,
            episodes: episodesToUpdate,
            watched_boolean: targetChecked,
          }),
        ];

        if (shouldUpdateStatus) {
          promises.push(
            upsertUserMediaAction({
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
              tmdb_rating: media.tmdb_rating ?? null,
            }),
          );
        }

        await Promise.all(promises);
      } catch {
        // Error handling
      }
    });
  }

  function handleToggleAllEpisodes(targetChecked: boolean) {
    const watchDate = targetChecked ? new Date().toISOString() : null;
    const allEpisodesList = seasons.flatMap((s) =>
      s.episodes.map((ep) => ({
        tmdb_episode_id: ep.tmdb_episode_id,
        season_number: ep.season_number,
        episode_number: ep.episode_number,
      })),
    );
    if (allEpisodesList.length === 0) return;

    const updatedSeasons = seasons.map((season) => ({
      ...season,
      episodes: season.episodes.map((ep) => ({
        ...ep,
        watched_boolean: targetChecked,
        watch_date: watchDate,
      })),
    }));

    setSeasons(updatedSeasons);

    const nextStatus = calculateNextStatusFromEpisodes(
      updatedSeasons,
      status,
      media.series_status,
    );
    const shouldUpdateStatus = nextStatus !== status;
    const isNextEligible =
      nextStatus === "watching" || nextStatus === "watched";
    const nextRating = isNextEligible ? (rating ?? savedRating) : null;

    if (shouldUpdateStatus) {
      setStatus(nextStatus);
      setRating(nextRating);
    }

    onStateChange?.({
      status: nextStatus,
      rating: nextRating,
      seasons: updatedSeasons,
    });

    startTransition(async () => {
      try {
        const promises: Promise<unknown>[] = [
          batchToggleAllEpisodesAction({
            tmdb_id: media.tmdb_id,
            title: media.title,
            poster_path: media.poster_path,
            episodes: allEpisodesList,
            watched_boolean: targetChecked,
          }),
        ];

        if (shouldUpdateStatus) {
          promises.push(
            upsertUserMediaAction({
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
              tmdb_rating: media.tmdb_rating ?? null,
            }),
          );
        }

        await Promise.all(promises);
      } catch {
        // Error handling
      }
    });
  }

  if (!isOpen) return null;

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm duration-150 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="radar-modal-title"
    >
      <div
        className="animate-in zoom-in-95 flex max-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl duration-150 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 sm:px-6 sm:py-4.5 font-sans">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <span
              id="radar-modal-title"
              className="text-base font-black tracking-tight text-white sm:text-xl truncate max-w-xs sm:max-w-md"
            >
              {media.title} — SEASONS
            </span>
            <span
              className={`${modalBadgeClass} rounded-xl px-2.5 py-0.5 font-mono text-xs font-black shadow-sm sm:px-3 sm:py-1 sm:text-sm`}
            >
              {status === null
                ? `0 / ${totalEpisodes} WATCHED`
                : `${watchedEpisodes} / ${totalEpisodes} WATCHED`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {totalEpisodes > 0 &&
              (watchedEpisodes < totalEpisodes ? (
                <button
                  type="button"
                  onClick={() => handleToggleAllEpisodes(true)}
                  disabled={isPending}
                  className="btn-zinc-interactive inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/50 px-3 py-1.5 font-mono text-xs font-bold text-emerald-300 transition-all duration-150 hover:border-emerald-400 hover:bg-emerald-900/60 hover:text-white hover:scale-[1.02] active:scale-95"
                  title="Mark all episodes across all seasons as watched"
                >
                  <span>✓</span>
                  <span className="hidden sm:inline">MARK ALL WATCHED</span>
                  <span className="sm:hidden">ALL</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleAllEpisodes(false)}
                  disabled={isPending}
                  className="btn-zinc-interactive inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 font-mono text-xs font-bold text-zinc-400 transition-all duration-150 hover:border-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 hover:scale-[1.02] active:scale-95"
                  title="Uncheck all episodes across all seasons"
                >
                  <span>↺</span>
                  <span className="hidden sm:inline">RESET ALL</span>
                  <span className="sm:hidden">RESET</span>
                </button>
              ))}

            <button
              type="button"
              onClick={onClose}
              className="btn-zinc-interactive flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-zinc-600 bg-zinc-700 font-mono text-sm font-bold text-zinc-200 transition-all duration-150 hover:border-zinc-400 hover:bg-zinc-500 hover:text-white"
              aria-label="Close episode guide modal"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Loading State or Content */}
        {isLoadingSeasons ? (
          <div className="flex min-h-60 flex-1 flex-col items-center justify-center gap-3 p-8">
            <LoadingSpinner size="lg" />
            <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Loading seasons &amp; episodes...
            </span>
          </div>
        ) : (
          <>
            {/* Season Selector Tabs */}
            <div className="flex max-h-40 shrink-0 flex-wrap gap-1.5 overflow-y-auto border-b border-zinc-800 bg-zinc-950/60 p-2">
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
                    className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs uppercase transition-all duration-150 sm:text-sm ${
                      isCurrent
                        ? "border border-zinc-500 bg-zinc-700 font-bold text-white shadow-sm hover:bg-zinc-500"
                        : "border border-transparent font-medium text-zinc-400 hover:bg-zinc-700/70 hover:text-white"
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
                      className="h-4 w-4 shrink-0 cursor-pointer rounded accent-emerald-500"
                    />
                    <span>SEASON {s.season_number}</span>
                    <span
                      className={`font-mono text-xs font-medium ${
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
            <ul className="min-h-60 flex-1 divide-y divide-zinc-800/80 overflow-y-auto bg-zinc-900">
              {currentSeason?.episodes.map((ep) => (
                <li
                  key={ep.tmdb_episode_id}
                  className="flex items-center justify-between gap-4 px-6 py-4 text-sm transition-colors hover:bg-zinc-800/50 sm:text-base"
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-4">
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
                      className="h-5.5 w-5.5 shrink-0 cursor-pointer rounded accent-emerald-500"
                    />
                    <span
                      className={`truncate ${
                        ep.watched_boolean
                          ? "font-normal text-zinc-500 line-through"
                          : "font-bold text-white"
                      }`}
                    >
                      <strong className="font-mono font-black text-zinc-200">
                        E{String(ep.episode_number).padStart(2, "0")}:
                      </strong>{" "}
                      {ep.title}
                    </span>
                  </label>
                  <span className="shrink-0 font-mono text-xs font-bold text-zinc-400 uppercase sm:text-sm">
                    {ep.watched_boolean && ep.watch_date
                      ? `WATCHED ${ep.watch_date.slice(0, 10)}`
                      : ep.air_date || "TBA"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
