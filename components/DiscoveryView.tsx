"use client";

import React, { useMemo, useState, useTransition } from "react";
import { getDiscoveryRecommendationsAction } from "@/app/actions/media";
import { FilmIcon, TvIcon } from "@/components/Icons";
import MediaCard from "@/components/MediaCard";
import {
  DISCOVERY_ERAS,
  DISCOVERY_GENRES,
  DiscoveryEngineResult,
  MEDIA_GRID_CLASS,
  MediaType,
  MergedMediaItem,
} from "@/lib/types";

interface DiscoveryViewProps {
  initialData: DiscoveryEngineResult;
  initialMediaType?: MediaType;
  seedId?: number;
  initialGenre?: string;
  initialDecade?: string;
}

export default function DiscoveryView({
  initialData,
  initialMediaType = "movie",
  seedId,
  initialGenre = "all",
  initialDecade = "2020s",
}: DiscoveryViewProps) {
  const [data, setData] = useState<DiscoveryEngineResult>(initialData);
  const [mediaType, setMediaType] = useState<MediaType>(initialMediaType);
  const [selectedGenre, setSelectedGenre] = useState<string>(initialGenre);
  const [selectedDecade, setSelectedDecade] = useState<string>(initialDecade);
  const [localTitleFilter, setLocalTitleFilter] = useState<string>("");
  const [currentSeedId, setCurrentSeedId] = useState<number | undefined>(seedId);
  const [isPending, startTransition] = useTransition();

  // Helper to sync URL state without page reload
  function updateUrl(
    type: MediaType,
    genre: string,
    decade: string,
    activeSeed?: number
  ) {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    params.set("type", type);
    if (activeSeed) params.set("seed", String(activeSeed));
    if (genre && genre !== "all") params.set("genre", genre);
    if (decade && decade !== "all") params.set("decade", decade);
    const newUrl = `/discover?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }

  // Unified recommendation loader for transitions
  function loadRecommendations(override?: {
    mediaType?: MediaType;
    seedId?: number | null;
    genreKey?: string;
    eraKey?: string;
    shuffle?: boolean;
    currentSeedId?: number;
  }) {
    const targetType = override?.mediaType ?? mediaType;
    const targetSeedId =
      override?.seedId !== undefined
        ? override.seedId === null
          ? undefined
          : override.seedId
        : currentSeedId;
    const targetGenre = override?.genreKey ?? selectedGenre;
    const targetEra = override?.eraKey ?? selectedDecade;

    startTransition(async () => {
      const refreshed = await getDiscoveryRecommendationsAction({
        mediaType: targetType,
        seedId: targetSeedId,
        genreKey: targetGenre,
        eraKey: targetEra,
        shuffle: override?.shuffle,
        currentSeedId: override?.currentSeedId,
        page: 1,
      });
      setData(refreshed);
    });
  }

  // Switch between Movie and TV Show engines (preserves selected decade!)
  function handleTypeSwitch(nextType: MediaType) {
    if (nextType === mediaType) return;
    setMediaType(nextType);
    setCurrentSeedId(undefined); // Clear seed on cross-type switch
    updateUrl(nextType, selectedGenre, selectedDecade);
    loadRecommendations({ mediaType: nextType, seedId: null, shuffle: true });
  }

  // Handle Decade / Era change
  function handleDecadeChange(nextDecade: string) {
    setSelectedDecade(nextDecade);
    updateUrl(mediaType, selectedGenre, nextDecade, currentSeedId);
    loadRecommendations({ eraKey: nextDecade });
  }

  // Handle Genre selection changes
  function handleGenreChange(nextGenre: string) {
    setSelectedGenre(nextGenre);
    updateUrl(mediaType, nextGenre, selectedDecade, currentSeedId);
    loadRecommendations({ genreKey: nextGenre });
  }

  // Handle Reload / Shuffle recommendations (re-rolls random 8+ seeds)
  function handleReload() {
    loadRecommendations({ shuffle: true, currentSeedId: data.seed?.id });
  }

  // Reset to full Auto-Pilot
  function handleResetAutoPilot() {
    setCurrentSeedId(undefined);
    updateUrl(mediaType, selectedGenre, selectedDecade);
    loadRecommendations({ seedId: null, shuffle: true });
  }

  // Live state updates on media cards
  function handleCardStateChange(updated: MergedMediaItem) {
    setData((prev) => {
      const currentList = prev.suggestions ?? [];
      return {
        ...prev,
        suggestions: currentList.map((item) =>
          item.tmdb_id === updated.tmdb_id ? updated : item
        ),
      };
    });
  }

  // Local title filter filtering
  const filteredItems = useMemo(() => {
    const suggestions = data.suggestions ?? [];
    const query = localTitleFilter.trim().toLowerCase();
    if (!query) return suggestions;
    return suggestions.filter((m) =>
      m.title.toLowerCase().includes(query)
    );
  }, [data.suggestions, localTitleFilter]);

  const activeSeed = data.seed;
  const isUrlSeeded = Boolean(activeSeed?.isUrlSeed);

  return (
    <div className="space-y-6">
      {/* =========================================================================
          TOP LEVEL ENGINE SWITCHER: WHAT MOVIE vs WHAT TV SHOW TO WATCH NEXT
          ========================================================================= */}
      <nav
        aria-label="Engine selector"
        className="grid grid-cols-2 border-2 border-black bg-white rounded-xs overflow-hidden text-xs sm:text-sm font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
      >
        <button
          type="button"
          onClick={() => handleTypeSwitch("movie")}
          className={`py-3 px-3 sm:px-6 flex items-center justify-center gap-2 transition-colors cursor-pointer border-r-2 border-black ${
            mediaType === "movie"
              ? "bg-black text-white"
              : "bg-white text-black hover:bg-neutral-100"
          }`}
        >
          <FilmIcon className="w-4 h-4 shrink-0" />
          <span className="truncate">WHAT MOVIE TO WATCH NEXT</span>
          {mediaType === "movie" && (
            <span className="text-[10px] hidden sm:inline">●</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTypeSwitch("tv")}
          className={`py-3 px-3 sm:px-6 flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            mediaType === "tv"
              ? "bg-black text-white"
              : "bg-white text-black hover:bg-neutral-100"
          }`}
        >
          <TvIcon className="w-4 h-4 shrink-0" />
          <span className="truncate">WHAT TV SHOW TO WATCH NEXT</span>
          {mediaType === "tv" && (
            <span className="text-[10px] hidden sm:inline">●</span>
          )}
        </button>
      </nav>

      {/* =========================================================================
          COMMAND BAR & CONTROLS (Unified Single-Strip Flow)
          ========================================================================= */}
      <section className="border-2 border-black bg-white p-3 sm:p-4 rounded-xs space-y-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        {/* Title Block with Seed Subtitle Directly Below */}
        <div className="space-y-1">
          <h1 className="text-lg sm:text-xl font-bold uppercase leading-tight">
            WHAT {mediaType === "movie" ? "MOVIE" : "TV SHOW"} TO WATCH NEXT ({filteredItems.length})
          </h1>

          {/* Seed indicator dropped directly below Title without box */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {isUrlSeeded ? (
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                <span className="text-neutral-500">SEED</span>
                <span className="text-neutral-400">•</span>
                <span className="text-black font-extrabold">{activeSeed.title}</span>
                <span className="text-neutral-400">•</span>
                <button
                  type="button"
                  onClick={handleResetAutoPilot}
                  className="border border-black bg-neutral-100 hover:bg-black hover:text-white text-black px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-xs transition-colors cursor-pointer"
                  title="Switch back to top rated auto-pilot"
                >
                  RESET TO AUTO-PILOT ✕
                </button>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral-500">
                <span>AUTO-PILOT</span>
                <span className="text-neutral-400">•</span>
                <span>RATED 8+</span>
                {activeSeed?.title && (
                  <>
                    <span className="text-neutral-400">•</span>
                    <span className="text-black font-extrabold">{activeSeed.title}</span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Unified Filter & Action Strip (Wrap naturally, standardize fonts & heights) */}
        <div className="pt-2 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs uppercase border-t border-neutral-100">
          {/* 1. Title Filter Input */}
          <div className="w-full sm:w-48 md:w-56 shrink-0">
            <input
              id="discovery-title-filter"
              type="text"
              value={localTitleFilter}
              onChange={(e) => setLocalTitleFilter(e.target.value)}
              placeholder={`FILTER ${mediaType === "movie" ? "MOVIES" : "SHOWS"}...`}
              className="w-full h-8 sm:h-8.5 border-2 border-black px-2.5 bg-white text-black text-xs font-bold uppercase rounded-xs focus:outline-none placeholder:text-neutral-400 placeholder:font-normal"
            />
          </div>

          {/* 2. Shuffle / Reload Button */}
          <button
            type="button"
            onClick={handleReload}
            disabled={isPending}
            className={`h-8 sm:h-8.5 px-3 border-2 border-black flex items-center gap-1.5 text-xs font-bold uppercase rounded-xs transition-colors cursor-pointer shrink-0 ${
              isPending
                ? "bg-neutral-200 text-neutral-500 cursor-wait"
                : "bg-white hover:bg-black hover:text-white text-black active:translate-y-0.5"
            }`}
            title="Reload fresh suggestions or switch seeds"
          >
            <span className={isPending ? "animate-spin inline-block" : ""}>
              ⟳
            </span>
            <span>{isPending ? "SEARCHING..." : "SHUFFLE"}</span>
          </button>

          {/* 3. Era / Decade Filter Segmented Group */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[10px] text-neutral-500 shrink-0">
              ERA:
            </span>
            <div
              className="inline-flex border-2 border-black divide-x-2 divide-black rounded-xs overflow-hidden bg-white text-xs font-bold uppercase"
              role="group"
              aria-label="Filter decade"
            >
              {DISCOVERY_ERAS.map((era) => {
                const isActive = selectedDecade === era.key;
                return (
                  <button
                    key={era.key}
                    type="button"
                    onClick={() => handleDecadeChange(era.key)}
                    disabled={isPending}
                    className={`h-8 sm:h-8.5 px-2.5 transition-colors cursor-pointer ${
                      isActive
                        ? "bg-black text-white"
                        : "bg-white text-black hover:bg-neutral-100"
                    }`}
                  >
                    {era.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Genre Filter Segmented Group */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[10px] text-neutral-500 shrink-0">
              GENRE:
            </span>
            <div
              className="inline-flex border-2 border-black divide-x-2 divide-black rounded-xs overflow-hidden bg-white text-xs font-bold uppercase"
              role="group"
              aria-label="Filter genre"
            >
              {DISCOVERY_GENRES.map((g) => {
                const isActive = selectedGenre === g.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => handleGenreChange(g.key)}
                    disabled={isPending}
                    className={`h-8 sm:h-8.5 px-2.5 transition-colors cursor-pointer ${
                      isActive
                        ? "bg-black text-white"
                        : "bg-white text-black hover:bg-neutral-100"
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SUGGESTIONS GRID (Standardized ~240px Card Dimensions)
          ========================================================================= */}
      <section className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="border-2 border-dashed border-black p-8 bg-white text-center text-xs uppercase font-bold text-neutral-500 space-y-2">
            <div>NO RECOMMENDATIONS FOUND MATCHING THESE FILTERS.</div>
            <div className="text-neutral-400 font-normal">
              TRY SWITCHING THE ERA, SELECTING &quot;ALL GENRES&quot;, OR CLICKING &quot;SHUFFLE / RELOAD&quot;.
            </div>
          </div>
        ) : (
          <div className={MEDIA_GRID_CLASS}>
            {filteredItems.map((item) => (
              <MediaCard
                key={`${mediaType}-${item.tmdb_id}`}
                media={item}
                onStateChange={handleCardStateChange}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
