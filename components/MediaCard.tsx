"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  fetchTvSeasonsAction,
  toggleEpisodeWatchedAction,
  upsertUserMediaAction,
} from "@/app/actions/media";
import {
  MediaStatus,
  MergedMediaItem,
  SeasonWireframeGroup,
} from "@/lib/types";

export interface MediaCardProps {
  media: MergedMediaItem;
  onStateChange?: (updated: MergedMediaItem) => void;
  showReleaseBanner?: boolean;
}

const STATUS_OPTIONS: Array<{ value: MediaStatus; label: string }> = [
  { value: "want_to_watch", label: "WANT" },
  { value: "watching", label: "WATCHING" },
  { value: "watched", label: "WATCHED" },
];

export default function MediaCard({
  media,
  onStateChange,
  showReleaseBanner = false,
}: MediaCardProps) {
  const [status, setStatus] = useState<MediaStatus | null>(media.status);
  const [rating, setRating] = useState<number | null>(media.rating);
  const [seasons, setSeasons] = useState<SeasonWireframeGroup[]>(
    media.seasons ?? []
  );
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [activeSeasonNumber, setActiveSeasonNumber] = useState<number>(
    media.seasons?.[0]?.season_number ?? 1
  );
  const [hasLoadedLiveSeasons, setHasLoadedLiveSeasons] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>(
    media.status ? "DB: TRACKED" : "DB: UNTRACKED"
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setStatus(media.status);
    setRating(media.rating);
    if (media.seasons && media.seasons.length > 0 && !hasLoadedLiveSeasons) {
      setSeasons(media.seasons);
    }
    setSyncMessage(media.status ? "DB: TRACKED" : "DB: UNTRACKED");
  }, [media.status, media.rating, media.seasons, hasLoadedLiveSeasons]);

  function handleStatusChange(nextStatus: MediaStatus) {
    const previousStatus = status;
    setStatus(nextStatus);
    setSyncMessage("SYNCING user_media...");

    const optimisticItem: MergedMediaItem = {
      ...media,
      status: nextStatus,
      rating,
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
          status: nextStatus,
          rating,
        });
        setStatus(result.status);
        setSyncMessage(`SAVED [${result.persistedTo.toUpperCase()}]`);
      } catch {
        setStatus(previousStatus);
        setSyncMessage("ERROR SAVING");
      }
    });
  }

  function handleRatingChange(nextRating: number | null) {
    const previousRating = rating;
    const effectiveStatus: MediaStatus = status ?? "watched";
    setRating(nextRating);
    setStatus(effectiveStatus);
    setSyncMessage("SYNCING rating...");

    const optimisticItem: MergedMediaItem = {
      ...media,
      status: effectiveStatus,
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
          status: effectiveStatus,
          rating: nextRating,
        });
        setRating(result.rating);
        setStatus(result.status);
        setSyncMessage(`SAVED [${result.persistedTo.toUpperCase()}]`);
      } catch {
        setRating(previousRating);
        setSyncMessage("ERROR SAVING");
      }
    });
  }

  function handleToggleAccordion() {
    const nextOpen = !isAccordionOpen;
    setIsAccordionOpen(nextOpen);

    if (
      nextOpen &&
      media.media_type === "tv" &&
      !hasLoadedLiveSeasons
    ) {
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
    setSyncMessage("SYNCING user_episodes...");

    startTransition(async () => {
      try {
        const result = await toggleEpisodeWatchedAction({
          tmdb_id: media.tmdb_id,
          title: media.title,
          poster_path: media.poster_path,
          tmdb_episode_id: tmdbEpisodeId,
          season_number: seasonNumber,
          episode_number: episodeNumber,
          watched_boolean: checked,
        });
        setSyncMessage(`EPISODE SAVED [${result.persistedTo.toUpperCase()}]`);
      } catch {
        setSyncMessage("EPISODE SYNC ERROR");
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

  return (
    <article
      className="border-2 border-black bg-white text-black flex flex-col justify-between"
      data-testid={`media-card-${media.tmdb_id}`}
    >
      {/* Top Structural Metadata Header */}
      <div>
        <div className="border-b-2 border-black px-2.5 py-1 flex items-center justify-between text-xs uppercase bg-neutral-100 font-bold">
          <span>{media.media_type === "tv" ? "TV SERIES" : "MOVIE"}</span>
          <span className="text-[11px] text-neutral-600 font-normal">{isPending ? "SAVING..." : ""}</span>
        </div>

        {/* Optional Release Radar Banner (Used in Calendar View) */}
        {showReleaseBanner && (media.next_air_date || media.release_date) && (
          <div className="border-b-2 border-black px-2 py-1 bg-black text-white text-xs uppercase flex items-center justify-between">
            <span>DATE: {media.next_air_date || media.release_date}</span>
            <span>{media.next_episode_label || "RELEASE"}</span>
          </div>
        )}

        {/* Grayscale Poster Placeholder / Asset */}
        <div className="aspect-[2/3] w-full border-b-2 border-black bg-neutral-200 flex flex-col items-center justify-center relative overflow-hidden">
          {media.poster_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://image.tmdb.org/t/p/w342${media.poster_path}`}
              alt={`${media.title} poster`}
              className="w-full h-full object-cover grayscale contrast-125"
              loading="lazy"
            />
          ) : (
            <div className="p-4 text-center text-xs uppercase text-neutral-600 flex flex-col items-center gap-1">
              <span className="border-2 border-black px-2 py-1 bg-white font-bold">
                NO POSTER
              </span>
            </div>
          )}
          {media.release_date && (
            <div className="absolute bottom-0 right-0 border-t-2 border-l-2 border-black bg-white/95 px-2 py-0.5 text-[10px] uppercase font-bold">
              {media.release_date}
            </div>
          )}
        </div>

        {/* Title Block */}
        <div className="p-3 border-b-2 border-black">
          <h3 className="text-sm font-bold uppercase leading-tight line-clamp-2">
            {media.title}
          </h3>
          {media.next_episode_label && (
            <p className="text-xs text-neutral-600 mt-1 uppercase">
              {media.next_episode_label}
            </p>
          )}
        </div>
      </div>

      {/* Interactive Controls Section */}
      <div>
        {/* Status Toggle Group (Want / Watching / Watched) */}
        <div className="border-b-2 border-black">
          <div className="px-2 py-1 text-[10px] uppercase bg-neutral-100 border-b border-black flex justify-between font-bold">
            <span>STATUS</span>
            <span>{status ? status.replace(/_/g, " ").toUpperCase() : "UNTRACKED"}</span>
          </div>
          <div
            className="grid grid-cols-3 divide-x-2 divide-black"
            role="group"
            aria-label="Watch status toggle group"
          >
            {STATUS_OPTIONS.map((option) => {
              const isActive = status === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleStatusChange(option.value)}
                  disabled={isPending}
                  aria-pressed={isActive}
                  className={`py-2 px-1 text-xs font-bold uppercase cursor-pointer transition-none ${
                    isActive
                      ? "bg-black text-white"
                      : "bg-white text-black hover:bg-neutral-200"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rating Input (1-10) */}
        <div className="p-2 border-b-2 border-black bg-white">
          <div className="flex items-center justify-between text-xs uppercase mb-1.5">
            <label
              htmlFor={`rating-select-${media.tmdb_id}`}
              className="font-bold text-[11px]"
            >
              RATING (1-10):
            </label>
            <select
              id={`rating-select-${media.tmdb_id}`}
              value={rating ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                handleRatingChange(val === "" ? null : Number(val));
              }}
              disabled={isPending}
              className="border-2 border-black bg-white text-black px-2 py-0.5 text-xs font-bold uppercase"
            >
              <option value="">-- / 10</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num} / 10
                </option>
              ))}
            </select>
          </div>

          {/* 1-10 Quick Touch/Click Bar */}
          <div className="grid grid-cols-10 border-2 border-black divide-x divide-black">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
              const isSelected = rating === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleRatingChange(num)}
                  disabled={isPending}
                  className={`py-1 text-[10px] font-bold cursor-pointer ${
                    isSelected
                      ? "bg-black text-white"
                      : "bg-white text-black hover:bg-neutral-200"
                  }`}
                  title={`Rate ${num}/10`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>

        {/* Expandable Accordion State for TV Seasons & Episodes */}
        {media.media_type === "tv" ? (
          <div>
            <button
              type="button"
              onClick={handleToggleAccordion}
              aria-expanded={isAccordionOpen}
              className="w-full px-3 py-2 text-xs font-bold uppercase flex items-center justify-between bg-neutral-100 hover:bg-neutral-200 cursor-pointer"
            >
              <span>
                {isAccordionOpen ? "[-]" : "[+]"} SEASONS &amp; EPISODES
              </span>
              <span>
                [{watchedEpisodes}/{totalEpisodes} WATCHED]
              </span>
            </button>

            {isAccordionOpen && (
              <div className="border-t-2 border-black bg-white">
                {/* Season Selector Tabs */}
                <div className="flex flex-wrap border-b-2 border-black bg-neutral-100">
                  {seasons.map((s) => {
                    const isCurrent = s.season_number === activeSeasonNumber;
                    return (
                      <button
                        key={s.season_number}
                        type="button"
                        onClick={() => setActiveSeasonNumber(s.season_number)}
                        className={`px-2.5 py-1 text-xs font-bold uppercase border-r-2 border-black cursor-pointer ${
                          isCurrent
                            ? "bg-black text-white"
                            : "bg-neutral-100 text-black hover:bg-neutral-200"
                        }`}
                      >
                        S{String(s.season_number).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>

                {/* Episodes Checklist */}
                <ul className="divide-y border-black max-h-52 overflow-y-auto">
                  {currentSeason?.episodes.map((ep) => (
                    <li
                      key={ep.tmdb_episode_id}
                      className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs hover:bg-neutral-100"
                    >
                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
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
                            ep.watched_boolean ? "line-through text-neutral-500" : ""
                          }`}
                        >
                          <strong>
                            E{String(ep.episode_number).padStart(2, "0")}:
                          </strong>{" "}
                          {ep.title}
                        </span>
                      </label>
                      <span className="text-[10px] text-neutral-600 shrink-0 uppercase">
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
        ) : null}
      </div>
    </article>
  );
}

