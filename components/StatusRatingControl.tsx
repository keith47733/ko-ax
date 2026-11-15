"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertUserMediaAction } from "@/app/actions/media";
import { BookmarkIcon, TvIcon } from "@/components/Icons";
import SeasonTrackerModal from "@/components/SeasonTrackerModal";
import { STATUS_DEFINITIONS } from "@/components/StatusToggle";
import {
  MediaStatus,
  MergedMediaItem,
  StatusRatingControlProps,
} from "@/types";

interface ExtendedStatusRatingControlProps extends StatusRatingControlProps {
  variant?: "badge" | "row";
}

export default function StatusRatingControl({
  media,
  onStateChange,
  className = "",
  variant = "badge",
}: ExtendedStatusRatingControlProps) {
  const router = useRouter();
  const [status, setStatus] = useState<MediaStatus | null>(media.status);
  const [rating, setRating] = useState<number | null>(media.rating);
  const [, setSavedRating] = useState<number | null>(media.rating);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isRatingEnabled = status === "watching" || status === "watched";
  const statusModalRef = useRef<HTMLDivElement>(null);

  // Sync state if incoming media props change
  const [prevMediaKey, setPrevMediaKey] = useState(
    `${media.tmdb_id}-${media.status}-${media.rating}`,
  );
  const currentMediaKey = `${media.tmdb_id}-${media.status}-${media.rating}`;
  if (prevMediaKey !== currentMediaKey) {
    setPrevMediaKey(currentMediaKey);
    setStatus(media.status);
    setRating(media.rating);
    if (media.rating !== null) {
      setSavedRating(media.rating);
    }
  }

  // Close unified popover on click outside or Escape
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (
        statusModalRef.current &&
        !statusModalRef.current.contains(e.target as Node)
      ) {
        setIsStatusModalOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsStatusModalOpen(false);
      }
    }
    if (isStatusModalOpen) {
      window.addEventListener("mousedown", handlePointerDown);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isStatusModalOpen]);

  function mutateUserMedia(
    nextStatus: MediaStatus | null,
    nextRating: number | null,
  ) {
    const previousStatus = status;
    const previousRating = rating;

    // Optimistic local update
    setStatus(nextStatus);
    setRating(nextRating);

    const updatedMedia: MergedMediaItem = {
      ...media,
      status: nextStatus,
      rating: nextRating,
      updated_at: new Date().toISOString(),
    };
    onStateChange?.(updatedMedia);

    startTransition(async () => {
      try {
        const res = await upsertUserMediaAction({
          tmdb_id: media.tmdb_id,
          title: media.title,
          media_type: media.media_type,
          poster_path: media.poster_path,
          release_date: media.release_date,
          next_air_date: media.next_air_date,
          next_episode_label: media.next_episode_label,
          overview: media.overview,
          status: nextStatus,
          rating: nextRating,
        });

        if (!res.ok) {
          setStatus(previousStatus);
          setRating(previousRating);
        } else {
          router.refresh();
        }
      } catch {
        setStatus(previousStatus);
        setRating(previousRating);
      }
    });
  }

  function handleStatusSelect(nextStatus: MediaStatus) {
    const isUnsetting = status === nextStatus;
    const resolvedStatus = isUnsetting ? null : nextStatus;
    const resolvedRating =
      resolvedStatus === null || resolvedStatus === "want_to_watch"
        ? null
        : rating;

    mutateUserMedia(resolvedStatus, resolvedRating);
  }

  function handleRatingSelect(newRating: number) {
    if (!isRatingEnabled) return;
    setSavedRating(newRating);
    mutateUserMedia(status, newRating);
  }

  function handleRatingClear() {
    if (!isRatingEnabled) return;
    setSavedRating(null);
    mutateUserMedia(status, null);
  }

  const activeStatusDef = STATUS_DEFINITIONS.find((d) => d.value === status);
  const StatusIcon = activeStatusDef ? activeStatusDef.Icon : BookmarkIcon;

  let buttonClasses =
    "border border-zinc-400/80 bg-zinc-900/60 text-white/90 shadow-xs backdrop-blur-md hover:bg-zinc-800 hover:border-zinc-300";
  if (activeStatusDef) {
    buttonClasses = `${activeStatusDef.accentBg} ${activeStatusDef.textColor} shadow-xs ${activeStatusDef.shadowColor} border border-white/90 ${activeStatusDef.activeHoverBg} ${activeStatusDef.activeHoverClass} hover:scale-105 hover:border-white`;
  }

  return (
    <div className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
      {variant === "badge" ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsStatusModalOpen((prev) => !prev);
          }}
          disabled={isPending}
          title={
            activeStatusDef
              ? `Status: ${activeStatusDef.fullLabel} • Click to modify status & rating`
              : "Untracked • Click to set status & rating"
          }
          className={`flex h-8 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg backdrop-blur-md transition-all active:scale-95 ${buttonClasses}`}
        >
          <StatusIcon className="h-4 w-4 shrink-0" />
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsStatusModalOpen((prev) => !prev);
          }}
          disabled={isPending}
          title={
            activeStatusDef
              ? `Status: ${activeStatusDef.fullLabel} • Click to modify`
              : "Untracked • Click to set status"
          }
          className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 font-mono text-xs font-bold transition-all active:scale-95 ${buttonClasses}`}
        >
          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{activeStatusDef?.shortLabel || "UNTRACKED"}</span>
        </button>
      )}

      {/* Unified Status & Rating Popover */}
      {isStatusModalOpen && (
        <>
          <div
            className="fixed inset-0 z-25 cursor-default bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsStatusModalOpen(false);
            }}
          />
          <div
            ref={statusModalRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-10 right-0 z-30 w-72 space-y-3 rounded-2xl bg-white p-3.5 text-zinc-950 shadow-xl ring-1 ring-black/10 select-text sm:w-80"
          >
            {/* Header with Title and Single X Close Button */}
            <div className="flex w-full items-center justify-between border-b border-zinc-200 pb-2">
              <span className="font-mono text-xs font-bold tracking-wider text-zinc-800 uppercase">
                STATUS &amp; RATING
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsStatusModalOpen(false);
                }}
                className="cursor-pointer p-0 font-mono text-sm leading-none font-bold text-zinc-400 transition-all hover:text-zinc-950 hover:scale-110"
                title="Close popup"
              >
                ✕
              </button>
            </div>

            {/* 1. Status Section */}
            <div className="space-y-1.5">
              <span className="block font-mono text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                WATCH STATUS
              </span>
              <div className="grid w-full grid-cols-3 gap-1.5">
                {STATUS_DEFINITIONS.map((opt) => {
                  const isActive = status === opt.value;
                  const isOptionDisabled =
                    media.media_type === "movie" && opt.value === "watching";

                  let chipStyle = `border border-zinc-200/90 bg-[#F4F3F0] text-zinc-800 ${opt.lightHoverBg} rounded-xl font-bold transition-all duration-150 hover:scale-[1.02]`;

                  if (isOptionDisabled) {
                    chipStyle =
                      "border border-transparent bg-[#F4F3F0]/60 text-zinc-400 line-through cursor-not-allowed rounded-xl opacity-40 select-none";
                  } else if (isActive) {
                    chipStyle = `${opt.accentBg} ${opt.textColor} rounded-xl shadow-xs border ${
                      opt.value === "want_to_watch"
                        ? "border-orange-500/50"
                        : opt.value === "watching"
                          ? "border-indigo-500/50"
                          : "border-emerald-500/50"
                    } ${opt.activeHoverBg} ${opt.activeHoverClass} hover:scale-[1.02] transition-all duration-150`;
                  }

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        if (!isOptionDisabled) {
                          handleStatusSelect(opt.value);
                        }
                      }}
                      disabled={isPending || isOptionDisabled}
                      className={`flex h-8.5 cursor-pointer items-center justify-center truncate px-1 font-mono text-xs uppercase transition-all ${chipStyle}`}
                    >
                      {opt.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Rating Section with standardized CLEAR text button */}
            <div
              className={`space-y-1.5 pt-1.5 border-t border-zinc-200/80 transition-opacity ${
                !isRatingEnabled ? "opacity-40" : ""
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-mono text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                  {isRatingEnabled
                    ? "RATE (1-10)"
                    : "RATE (WATCHING / WATCHED ONLY)"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRatingClear();
                  }}
                  disabled={isPending || !isRatingEnabled || rating === null}
                  className={`btn-text-clear-dark font-mono text-xs font-bold tracking-wider uppercase transition-all duration-150 ${
                    isRatingEnabled && rating !== null
                      ? "cursor-pointer text-zinc-400 hover:text-zinc-950 hover:underline"
                      : "cursor-not-allowed text-zinc-300 select-none"
                  }`}
                  title={
                    isRatingEnabled
                      ? "Clear rating"
                      : "Mark as Watching or Watched to rate"
                  }
                >
                  CLEAR
                </button>
              </div>

              {/* 10-Star Interactive Rating Picker */}
              <div
                className={`flex w-full items-center justify-between pt-0.5 ${
                  !isRatingEnabled ? "cursor-not-allowed" : ""
                }`}
                onMouseLeave={() => setHoverRating(null)}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starVal, idx) => {
                  const isHovering = isRatingEnabled && hoverRating !== null;
                  const isFilledHover = isHovering && starVal <= hoverRating;
                  const isFilledSaved =
                    !isHovering &&
                    isRatingEnabled &&
                    rating !== null &&
                    starVal <= rating;

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
                      onClick={() => {
                        if (isRatingEnabled) {
                          handleRatingSelect(starVal);
                        }
                      }}
                      onMouseEnter={() => {
                        if (isRatingEnabled) {
                          setHoverRating(starVal);
                        }
                      }}
                      disabled={isPending || !isRatingEnabled}
                      className={`flex shrink-0 items-center justify-center text-zinc-900 transition-transform ${
                        isRatingEnabled
                          ? "cursor-pointer hover:scale-125"
                          : "cursor-not-allowed pointer-events-none"
                      } ${paddingClass}`}
                      title={
                        isRatingEnabled
                          ? `Rate ${starVal} / 10`
                          : "Mark as Watching or Watched to rate"
                      }
                    >
                      <svg
                        className={`h-4.5 w-4.5 transition-colors ${starClass}`}
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

            {/* 3. Season & Episode Tracker Trigger (TV Shows Only) */}
            {media.media_type === "tv" && (
              <div className="pt-2 border-t border-zinc-200/80">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsStatusModalOpen(false);
                    setIsSeasonModalOpen(true);
                  }}
                  className="btn-zinc-interactive flex w-full cursor-pointer items-center justify-between rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs font-bold text-white shadow-xs transition-all duration-150 hover:bg-zinc-700 hover:text-white hover:scale-[1.01] active:scale-98"
                  title="Open Seasons & Episodes Tracker"
                >
                  <div className="flex items-center gap-2">
                    <TvIcon className="h-3.5 w-3.5 text-indigo-300 stroke-[2.2]" />
                    <span>SEASONS &amp; EPISODES</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-zinc-400">
                    →
                  </span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Full-screen season tracker modal */}
      {media.media_type === "tv" && isSeasonModalOpen && (
        <SeasonTrackerModal
          isOpen={isSeasonModalOpen}
          onClose={() => setIsSeasonModalOpen(false)}
          media={media}
          initialStatus={status}
          initialRating={rating}
          onStateChange={(updated) => {
            setStatus(updated.status);
            setRating(updated.rating);
            onStateChange?.({
              ...media,
              status: updated.status,
              rating: updated.rating,
              seasons: updated.seasons,
            });
          }}
        />
      )}
    </div>
  );
}
