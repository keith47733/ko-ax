"use client";

import { upsertUserMediaAction } from "@/app/actions/media";
import { CompassIcon, ProjectorIcon, TvIcon } from "@/components/Icons";
import SearchBar from "@/components/SearchBar";
import SeasonTrackerModal from "@/components/SeasonTrackerModal";
import { StatusToggleGroup } from "@/components/StatusToggle";
import { getDecadeFromDate } from "@/lib/utils";
import {
  MediaDetailViewProps,
  MediaStatus,
  MergedMediaItem,
  SeasonWireframeGroup,
} from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

export default function MediaDetailView({
  initialMedia,
}: MediaDetailViewProps) {
  const router = useRouter();
  const [media, setMedia] = useState<MergedMediaItem>(initialMedia);
  const [status, setStatus] = useState<MediaStatus | null>(initialMedia.status);
  const [rating, setRating] = useState<number | null>(initialMedia.rating);
  const [savedRating, setSavedRating] = useState<number | null>(
    initialMedia.rating,
  );
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const isRatingEnabled = status === "watching" || status === "watched";

  const initialSeasons = useMemo(() => {
    if (initialMedia.seasons && initialMedia.seasons.length > 0) {
      return initialMedia.seasons;
    }
    return [];
  }, [initialMedia.seasons]);

  const [seasons, setSeasons] =
    useState<SeasonWireframeGroup[]>(initialSeasons);
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
    if (initialMedia.rating !== null) {
      setSavedRating(initialMedia.rating);
    }
    const resolved =
      initialMedia.seasons && initialMedia.seasons.length > 0
        ? initialMedia.seasons
        : [];
    setSeasons(resolved);
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
    if (nextRating !== null) {
      setSavedRating(nextRating);
    } else {
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
          tmdb_rating: media.tmdb_rating ?? null,
        });
        setStatus(result.status);
        setRating(result.rating);
        if (result.rating !== null) {
          setSavedRating(result.rating);
        }
      } catch {
        setStatus(previousStatus);
        setRating(previousRating);
      }
    });
  }

  function handleStatusChange(clickedStatus: MediaStatus) {
    const nextStatus: MediaStatus | null =
      status === clickedStatus ? null : clickedStatus;
    const isNextEligible =
      nextStatus === "watching" || nextStatus === "watched";
    const nextRating = isNextEligible ? (rating ?? savedRating) : null;

    setRating(nextRating);
    mutateUserMedia(nextStatus, nextRating);

    // If TV Show marked as WATCHED, locally mark all seasons/episodes as watched too
    if (nextStatus === "watched" && media.media_type === "tv") {
      const now = new Date().toISOString();
      setSeasons((prevSeasons) =>
        prevSeasons.map((s) => ({
          ...s,
          episodes: s.episodes.map((ep) => ({
            ...ep,
            watched_boolean: true,
            watch_date: now,
          })),
        })),
      );
    }
  }

  function handleRatingClick(starValue: number) {
    if (!isRatingEnabled || status === null) return;
    if (rating === starValue) return;
    setSavedRating(starValue);
    mutateUserMedia(status, starValue);
  }

  function handleClearRating() {
    if (!isRatingEnabled) return;
    setSavedRating(null);
    mutateUserMedia(status, null);
  }

  const totalEpisodes = seasons.reduce((acc, s) => acc + s.episodes.length, 0);
  const watchedEpisodes = seasons.reduce(
    (acc, s) => acc + s.episodes.filter((e) => e.watched_boolean).length,
    0,
  );

  const releaseStatusInfo = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const dateStr = media.release_date || media.next_air_date || "";
    const isUpcoming = Boolean(dateStr && dateStr > today);
    const releaseYear = isUpcoming
      ? "UPCOMING"
      : dateStr
        ? dateStr.slice(0, 4)
        : "—";

    return {
      releaseYear,
      isUpcoming,
    };
  }, [media.release_date, media.next_air_date]);

  // 1. User watch progress telemetry
  let userProgressInfo = {
    label: "WATCH PROGRESS:",
    value: "NOT TRACKING (OR UNTRACKED)",
    isUntracked: true,
  };

  if (status === "want_to_watch") {
    userProgressInfo = {
      label: "WATCH PROGRESS:",
      value: "ON WATCHLIST (START WITH S01E01)",
      isUntracked: false,
    };
  } else if (
    status === "watched" ||
    (totalEpisodes > 0 && watchedEpisodes === totalEpisodes)
  ) {
    const isEnded =
      media.series_status === "Ended" || media.series_status === "Canceled";
    userProgressInfo = {
      label: "WATCH PROGRESS:",
      value: isEnded
        ? "ALL EPISODES WATCHED (SERIES COMPLETE)"
        : "CAUGHT UP WITH BROADCAST",
      isUntracked: false,
    };
  } else if (status !== null) {
    let foundNext = false;
    for (const s of seasons) {
      const unwatched = s.episodes.find((ep) => !ep.watched_boolean);
      if (unwatched) {
        userProgressInfo = {
          label: "NEXT EPISODE TO WATCH:",
          value: `S${String(s.season_number).padStart(2, "0")}E${String(unwatched.episode_number).padStart(2, "0")} — ${unwatched.title}`,
          isUntracked: false,
        };
        foundNext = true;
        break;
      }
    }
    if (!foundNext) {
      userProgressInfo = {
        label: "NEXT EPISODE TO WATCH:",
        value: "ALL CAUGHT UP",
        isUntracked: false,
      };
    }
  }

  // 2. Real-world broadcast / air telemetry
  const broadcastStatusLabel = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const hasLiveFutureAirDate = Boolean(
      (media.next_air_date && media.next_air_date >= today) ||
        (media.next_episode_to_air?.air_date &&
          media.next_episode_to_air.air_date >= today),
    );
    return hasLiveFutureAirDate ? "NEXT EPISODE TO AIR:" : "BROADCAST STATUS:";
  }, [media.next_air_date, media.next_episode_to_air]);

  const nextAirEpisode = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const lastSeasonNum =
      media.last_episode_to_air?.season_number ||
      media.number_of_seasons ||
      seasons.length ||
      1;

    // A. Check if there is a scheduled upcoming live broadcast
    const hasLiveFutureAirDate = Boolean(
      media.next_air_date && media.next_air_date >= today,
    );
    const hasLiveFutureNextEpisode = Boolean(
      media.next_episode_to_air?.air_date &&
        media.next_episode_to_air.air_date >= today,
    );

    if (hasLiveFutureAirDate || hasLiveFutureNextEpisode) {
      const airDateStr =
        media.next_episode_to_air?.air_date || media.next_air_date || "";
      if (media.next_episode_to_air) {
        const s = String(media.next_episode_to_air.season_number).padStart(2, "0");
        const e = String(media.next_episode_to_air.episode_number).padStart(2, "0");
        const title = media.next_episode_to_air.name
          ? ` — ${media.next_episode_to_air.name}`
          : "";
        const datePart = airDateStr ? ` (${airDateStr})` : "";
        return `S${s}E${e}${title}${datePart}`;
      }
      if (media.next_episode_label) {
        return `${media.next_episode_label}${airDateStr ? ` (${airDateStr})` : ""}`;
      }
      return `Airing ${airDateStr}`;
    }

    // B. Check TMDB series status:
    const statusLower = (media.series_status || "").toLowerCase();

    if (statusLower === "canceled" || statusLower === "cancelled") {
      return `Series Concluded (Canceled after Season ${lastSeasonNum})`;
    }

    if (statusLower === "ended") {
      return totalEpisodes > 0
        ? `Series Concluded (${totalEpisodes} Episodes)`
        : "Series Concluded";
    }

    if (
      statusLower === "returning series" ||
      statusLower === "in production" ||
      statusLower === "planned"
    ) {
      const nextSeason = lastSeasonNum + 1;
      return `Returning Series (Awaiting Season ${nextSeason})`;
    }

    // C. Fallback: if all episodes are watched or no future info
    if (totalEpisodes > 0 && watchedEpisodes === totalEpisodes) {
      return `Series Concluded (${totalEpisodes} Episodes)`;
    }

    return "Awaiting announcement";
  }, [
    media.next_air_date,
    media.next_episode_label,
    media.next_episode_to_air,
    media.last_episode_to_air,
    media.number_of_seasons,
    media.series_status,
    seasons.length,
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

  const trackerBadgeClass = useMemo(() => {
    switch (status) {
      case "watching":
        return "border-indigo-500/50 text-periwinkle";
      case "want_to_watch":
        return "border-orange-500/50 text-coral";
      case "watched":
        return "border-emerald-500/50 text-mint";
      default:
        return "border-zinc-500/60 text-zinc-400";
    }
  }, [status]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] -m-3 sm:-m-4 md:-m-6 bg-zinc-950 text-white selection:bg-zinc-800 selection:text-white">
      {/* ============================================================
          1. FULL-BLEED FIXED BLACK & WHITE DARKENED BACKDROP (+10% lightened)
          ======================================================== */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {backdropUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdropUrl}
            alt=""
            className="h-full w-full object-cover filter grayscale contrast-115 brightness-[0.55]"
          />
        ) : (
          <div className="h-full w-full bg-zinc-950" />
        )}
        {/* Lighter scrim gradient (+10% lightened) so the backdrop scene is clearly visible */}
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950/80 via-zinc-950/50 to-zinc-950/20" />
      </div>

      {/* ============================================================
          2. DETAIL CONTENT CONTAINER
          ======================================================== */}
      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col">
        {/* Top Navigation: Fixed frosted lighter sub-bar directly flush under header with BACK - SEARCH - FIND SIMILAR */}
        <div className="fixed top-16 inset-x-0 z-30 flex h-11 items-center border-t border-t-zinc-200/80 border-b border-b-zinc-300/80 bg-canvas/90 shadow-xs shadow-black/5 backdrop-blur-md transition-colors">
          <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={handleExit}
              aria-label="Back to previous page"
              title="Back (Esc)"
              className="btn-zinc-interactive shrink-0 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 font-mono text-xs font-bold text-white shadow-sm transition-all duration-150 hover:bg-zinc-700 hover:text-white hover:scale-[1.02]"
            >
              <span>←</span>
              <span>BACK</span>
            </button>

            {/* Contextual Centered Search Bar */}
            <SearchBar
              id="global-search-input-detail"
              className="max-w-xs sm:max-w-md md:max-w-lg"
            />

            <Link
              href={`/discover?type=${media.media_type}&seed=${media.tmdb_id}&decade=${getDecadeFromDate(media.release_date || media.next_air_date)}`}
              className="btn-zinc-interactive shrink-0 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 font-mono text-xs font-bold text-white shadow-sm transition-all duration-150 hover:bg-zinc-700 hover:text-white hover:scale-[1.02]"
              title="Discover similar titles"
            >
              <CompassIcon className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
              <span className="hidden sm:inline">FIND SIMILAR</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Content Grid: Left Poster, Right Info (pt-17 gives clean 24px clearance below 44px fixed sub-bar) */}
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pt-17 pb-20 md:flex-row lg:gap-12">
          {/* Left Column: Centered on mobile, fixed width on desktop */}
          <div className="mx-auto w-64 shrink-0 sm:w-72 md:mx-0 md:w-76 lg:w-80">
            {posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={posterUrl}
                alt={media.title}
                className="aspect-2/3 w-full rounded-2xl border border-zinc-700 object-cover shadow-2xl shadow-black/80"
              />
            ) : (
              <div className="flex aspect-2/3 w-full flex-col items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900/80 p-6 text-center font-mono text-sm text-zinc-500 uppercase shadow-2xl shadow-black/80">
                NO POSTER ART
              </div>
            )}
          </div>

          {/* Right Column: True Left-Aligned on Desktop, Centered on Mobile */}
          <div className="min-w-0 flex-1 flex flex-col items-center text-center md:items-start md:text-left">
            {/* Title */}
            <h1 className="mb-4 text-balance font-sans text-4xl leading-tight font-black tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              {media.title}
            </h1>

            {/* Under Title Metadata: ICON - YEAR - RATING (Matching Media Card syntax) */}
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2.5 font-mono text-sm uppercase tracking-wider sm:gap-3 sm:text-base md:justify-start md:text-lg">
              {/* 1. Format Icon Badge (Enlarged to match font size) */}
              {media.media_type === "tv" ? (
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-indigo-300 bg-indigo-100 shadow-xs sm:h-7.5 sm:w-7.5"
                  title="TV Show"
                >
                  <TvIcon className="h-4 w-4 text-zinc-950 stroke-[2.2] sm:h-4.5 sm:w-4.5" />
                </span>
              ) : (
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-amber-100 shadow-xs sm:h-7.5 sm:w-7.5"
                  title="Movie"
                >
                  <ProjectorIcon className="h-4 w-4 text-zinc-950 stroke-[2.2] sm:h-4.5 sm:w-4.5" />
                </span>
              )}

              {/* Bullet Separator between Icon and Year */}
              <span className="text-zinc-600 select-none">•</span>

              {/* 2. Release Year */}
              <span
                className={`font-black ${
                  releaseStatusInfo.isUpcoming
                    ? "text-coral"
                    : "text-white"
                }`}
              >
                {releaseStatusInfo.releaseYear}
              </span>

              {/* 3. Bullet Separator */}
              <span className="text-zinc-600 select-none">•</span>

              {/* 4. Rating */}
              {media.tmdb_rating !== undefined && media.tmdb_rating !== null ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-white">
                  <span className="font-bold text-white">
                    {media.tmdb_rating.toFixed(1)}
                  </span>
                  <span className="text-base text-amber-400 font-black leading-none sm:text-lg">
                    ★
                  </span>
                  <span className="font-semibold text-zinc-400">
                    {(media.rating_source || "imdb").toUpperCase()}
                  </span>
                </span>
              ) : (
                <span className="font-medium text-zinc-500">UNRATED</span>
              )}
            </div>

            {/* Status Toggle Group (Equal column widths, ~15% reduced container width) */}
            <div className="mb-5 flex w-full justify-center md:justify-start">
              <div className="w-full max-w-91.25">
                <StatusToggleGroup
                  status={status}
                  mediaType={media.media_type}
                  onChange={handleStatusChange}
                  disabled={isPending}
                  theme="dark"
                  boxed={false}
                />
              </div>
            </div>

            {/* 10-Star Rating Picker (Reduced size, tightened inter-star gap) */}
            <div
              className={`mb-5 flex flex-wrap items-center justify-center gap-2.5 transition-opacity md:justify-start ${
                !isRatingEnabled ? "opacity-40" : ""
              }`}
            >
              <div
                className={`flex items-center gap-0.5 md:-ml-0.5 ${
                  !isRatingEnabled ? "cursor-not-allowed" : ""
                }`}
                onMouseLeave={() => setHoverRating(null)}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starVal) => {
                  const isHovering = isRatingEnabled && hoverRating !== null;
                  const isFilledHover = isHovering && starVal <= hoverRating;
                  const isFilledSaved =
                    !isHovering &&
                    isRatingEnabled &&
                    rating !== null &&
                    starVal <= rating;

                  const starColorClass = isFilledSaved
                    ? "fill-amber-400 stroke-amber-500"
                    : isFilledHover
                      ? "fill-amber-300/80 stroke-amber-400"
                      : "fill-zinc-800/60 stroke-zinc-500 stroke-[1.6]";

                  return (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => {
                        if (isRatingEnabled) {
                          handleRatingClick(starVal);
                          setHoverRating(null);
                        }
                      }}
                      onMouseEnter={() => {
                        if (isRatingEnabled) {
                          setHoverRating(starVal);
                        }
                      }}
                      disabled={isPending || !isRatingEnabled}
                      title={
                        isRatingEnabled
                          ? `Rate ${starVal} / 10`
                          : "Mark as Watching or Watched to rate"
                      }
                      className={`flex items-center justify-center p-0.5 text-white transition-transform ${
                        isRatingEnabled
                          ? "cursor-pointer hover:scale-125"
                          : "cursor-not-allowed pointer-events-none"
                      }`}
                    >
                      <svg
                        className={`h-4.5 w-4.5 transition-colors sm:h-5 sm:w-5 ${starColorClass}`}
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

              {isRatingEnabled && rating !== null && (
                <button
                  type="button"
                  onClick={handleClearRating}
                  className="btn-text-clear ml-2.5 shrink-0 cursor-pointer font-mono text-xs font-bold tracking-wider text-zinc-400 uppercase transition-all duration-150 hover:text-white hover:underline"
                  title="Clear rating"
                >
                  CLEAR
                </button>
              )}

              {!isRatingEnabled && (
                <span className="font-mono text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  (Rate when Watching or Watched)
                </span>
              )}
            </div>

            {/* Overview Prose */}
            <div className="mb-6 max-w-3xl">
              <p className="font-sans text-sm leading-relaxed font-normal text-zinc-300 sm:text-base md:text-lg">
                {media.overview ||
                  "No detailed synopsis available for this title."}
              </p>
            </div>

            {/* Clean Season/Episode Summary: Grouped WATCH & AIR lines with vertically centered Tracker button */}
            {(media.media_type === "tv" || seasons.length > 0) && (
              <div className="mb-8 flex w-full flex-col sm:flex-row items-center md:items-center justify-center md:justify-start gap-4 sm:gap-8 font-mono text-xs sm:text-sm">
                {/* Tightly grouped 2-line telemetry block */}
                <div className="flex flex-col gap-1 text-center md:text-left">
                  {/* Line 1: USER WATCH PROGRESS */}
                  <div className="flex flex-wrap items-baseline justify-center md:justify-start gap-x-2.5">
                    <span className="font-bold tracking-wider text-zinc-400 uppercase">
                      {userProgressInfo.label}
                    </span>
                    <span
                      className={`font-semibold ${userProgressInfo.isUntracked ? "text-zinc-400" : "text-white"}`}
                    >
                      {userProgressInfo.value}
                    </span>
                  </div>

                  {/* Line 2: REAL-WORLD BROADCAST / AIR STATUS */}
                  <div className="flex flex-wrap items-baseline justify-center md:justify-start gap-x-2.5">
                    <span className="font-bold tracking-wider text-zinc-400 uppercase">
                      {broadcastStatusLabel}
                    </span>
                    <span className="font-semibold text-zinc-200">
                      {nextAirEpisode}
                    </span>
                  </div>
                </div>

                {/* Vertically centered Season Tracker button beside both lines with generous space */}
                <button
                  type="button"
                  onClick={() => setIsRadarModalOpen(true)}
                  className="btn-zinc-interactive inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-600 bg-zinc-700/90 px-3.5 py-2 font-mono text-xs font-bold text-white shadow-sm transition-all duration-150 hover:border-zinc-400 hover:bg-zinc-500 hover:text-white hover:scale-[1.02] active:scale-95"
                  title="Open Season Tracker modal"
                >
                  <span>SEASON TRACKER</span>
                  <span
                    className={`rounded-md border bg-zinc-800 px-1.5 py-0.5 text-[11px] font-bold ${trackerBadgeClass}`}
                  >
                    {status === null
                      ? `0/${totalEpisodes}`
                      : `${watchedEpisodes}/${totalEpisodes}`}
                  </span>
                  <span>↗</span>
                </button>
              </div>
            )}

            {/* SEASON TRACKER MODAL */}
            {isRadarModalOpen && (
              <SeasonTrackerModal
                isOpen={isRadarModalOpen}
                onClose={() => setIsRadarModalOpen(false)}
                media={{
                  ...media,
                  seasons,
                }}
                initialStatus={status}
                initialRating={rating}
                onStateChange={(updated) => {
                  setStatus(updated.status);
                  setRating(updated.rating);
                  setSeasons(updated.seasons);
                  setMedia((prev) => ({
                    ...prev,
                    status: updated.status,
                    rating: updated.rating,
                    seasons: updated.seasons,
                    updated_at: new Date().toISOString(),
                  }));
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
