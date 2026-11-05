"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
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
  initialDecade = "all",
}: DiscoveryViewProps) {
  const [data, setData] = useState<DiscoveryEngineResult>(initialData);
  const [mediaType, setMediaType] = useState<MediaType>(initialMediaType);
  const [selectedGenre, setSelectedGenre] = useState<string>(initialGenre);
  const [selectedDecade, setSelectedDecade] = useState<string>(initialDecade);
  const [localTitleFilter, setLocalTitleFilter] = useState<string>("");
  const [currentSeedId, setCurrentSeedId] = useState<number | undefined>(
    seedId,
  );
  const [isPending, startTransition] = useTransition();

  // Infinite Scroll Pagination State (loads 20 more as user reaches bottom)
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Sync state during render when props change
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  if (prevInitialData !== initialData) {
    setPrevInitialData(initialData);
    setData(initialData);
    setMediaType(initialMediaType);
    setSelectedGenre(initialGenre);
    setSelectedDecade(initialDecade);
    setCurrentSeedId(seedId);
    setLocalTitleFilter("");
    setPage(1);
    setHasMore(true);
  }

  // Helper to sync URL state without page reload
  function updateUrl(
    type: MediaType,
    genre: string,
    decade: string,
    activeSeed?: number,
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

    setPage(1);
    setHasMore(true);

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

  // Infinite scroll loader: fetches next page of 20 recommendations from TMDB
  const loadMoreRecommendations = useCallback(async () => {
    if (isLoadingMore || !hasMore || isPending) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const nextBatch = await getDiscoveryRecommendationsAction({
        mediaType,
        seedId: currentSeedId,
        genreKey: selectedGenre,
        eraKey: selectedDecade,
        page: nextPage,
      });

      const newSuggestions = nextBatch.suggestions ?? [];
      if (newSuggestions.length === 0) {
        setHasMore(false);
      } else {
        setData((prev) => {
          const existingIds = new Set(
            (prev.suggestions ?? []).map((i) => i.tmdb_id),
          );
          const uniqueNew = newSuggestions.filter(
            (i) => !existingIds.has(i.tmdb_id),
          );
          if (uniqueNew.length === 0) {
            setHasMore(false);
            return prev;
          }
          return {
            ...prev,
            suggestions: [...(prev.suggestions ?? []), ...uniqueNew],
          };
        });
        setPage(nextPage);
      }
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore,
    hasMore,
    isPending,
    page,
    mediaType,
    currentSeedId,
    selectedGenre,
    selectedDecade,
  ]);

  // IntersectionObserver for infinite scroll trigger
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isPending || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreRecommendations();
        }
      },
      { rootMargin: "350px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isPending, isLoadingMore, loadMoreRecommendations]);

  // Switch between Movie and TV Show engines
  function handleTypeSwitch(nextType: MediaType) {
    if (nextType === mediaType) return;
    setMediaType(nextType);
    setCurrentSeedId(undefined);
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

  // "I'M FEELING LUCKY" button: pick another random 8+ rated title to re-seed
  function handleShuffleSeed() {
    loadRecommendations({
      shuffle: true,
      currentSeedId: data.seed?.id,
      seedId: null,
    });
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
          item.tmdb_id === updated.tmdb_id ? updated : item,
        ),
      };
    });
  }

  // Local title filter filtering
  const filteredItems = useMemo(() => {
    const suggestions = data.suggestions ?? [];
    const query = localTitleFilter.trim().toLowerCase();
    if (!query) return suggestions;
    return suggestions.filter((m) => m.title.toLowerCase().includes(query));
  }, [data.suggestions, localTitleFilter]);

  const activeSeed = data.seed;
  const isUrlSeeded = Boolean(activeSeed?.isUrlSeed);

  return (
    <div className="flex flex-col lg:flex-row gap-5 sm:gap-6 items-start w-full">
      {/* =========================================================================
          LEFT (20%) FRAME: Archival Discovery Filter Console
          ========================================================================= */}
      <aside className="w-full lg:w-72 shrink-0 border border-stone-300 rounded-md bg-stone-50 p-4 shadow-sm space-y-4">
        {/* Frame Header with View Title & Count */}
        <div className="border-b border-stone-200 pb-3 flex items-center justify-between gap-2">
          <h2 className="font-serif text-sm sm:text-base font-bold text-stone-900 tracking-tight truncate">
            DISCOVER RADAR
          </h2>
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded border border-stone-300 shrink-0 bg-stone-200 text-stone-700">
            [{filteredItems.length}]
          </span>
        </div>

        {/* 1. Engine Switcher: Movies vs TV Shows */}
        <div className="grid grid-cols-2 border border-stone-300 divide-x divide-stone-300 rounded-md overflow-hidden text-xs sm:text-sm font-mono uppercase bg-stone-50 shadow-sm">
          <button
            type="button"
            onClick={() => handleTypeSwitch("movie")}
            className={`py-2.5 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              mediaType === "movie"
                ? "bg-stone-800 text-white font-medium"
                : "bg-stone-50 text-stone-600 hover:bg-stone-100"
            }`}
          >
            <FilmIcon className="w-4 h-4 shrink-0" />
            <span>MOVIES</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeSwitch("tv")}
            className={`py-2.5 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              mediaType === "tv"
                ? "bg-stone-800 text-white font-medium"
                : "bg-stone-50 text-stone-600 hover:bg-stone-100"
            }`}
          >
            <TvIcon className="w-4 h-4 shrink-0" />
            <span>TV SHOWS</span>
          </button>
        </div>

        {/* 2. Seed Block ("Similar to {Title}" + "I'M FEELING LUCKY" text button) */}
        <div className="p-3 border border-stone-300 bg-stone-100/70 rounded-md space-y-1.5 shadow-sm">
          <span className="text-[10px] font-mono uppercase font-medium text-stone-500 block leading-none">
            RECOMMENDATIONS:
          </span>
          <div className="flex items-baseline justify-between gap-1.5">
            <span className="font-serif text-xs sm:text-sm font-semibold tracking-tight text-stone-900 truncate">
              SIMILAR TO{" "}
              {activeSeed?.title ||
                (mediaType === "movie" ? "TOP MOVIES" : "TOP SHOWS")}
            </span>
            {isUrlSeeded && (
              <button
                type="button"
                onClick={handleResetAutoPilot}
                className="text-[10px] font-mono font-medium text-stone-500 hover:text-stone-900 underline cursor-pointer shrink-0"
                title="Switch back to top-rated auto-pilot"
              >
                RESET ✕
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleShuffleSeed}
            disabled={isPending}
            className="text-[10px] font-mono font-medium uppercase text-orange-700 hover:text-orange-800 underline flex items-center gap-1 cursor-pointer pt-0.5 transition-colors"
            title="Pick another random 8+ rated title to seed recommendations"
          >
            <span>➔ I&apos;M FEELING LUCKY (NEW SEED)</span>
          </button>
        </div>

        {/* 3. Filter by Title */}
        <div>
          <input
            id="discovery-title-filter"
            type="text"
            value={localTitleFilter}
            onChange={(e) => setLocalTitleFilter(e.target.value)}
            placeholder={`FILTER ${mediaType === "movie" ? "MOVIES" : "SHOWS"}...`}
            className="w-full h-9 border border-stone-300 rounded-md px-2.5 bg-stone-50 text-stone-900 text-xs sm:text-sm font-sans focus:outline-none focus:border-stone-500 placeholder:text-stone-400"
          />
        </div>

        {/* 4. Release Era Filter */}
        <div className="space-y-1">
          <span className="block text-[10px] font-mono font-medium uppercase text-stone-500 tracking-wider">
            RELEASE ERA
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-xs sm:text-sm font-mono uppercase">
            {DISCOVERY_ERAS.map((era) => {
              const isActive = selectedDecade === era.key;
              return (
                <button
                  key={era.key}
                  type="button"
                  onClick={() => handleDecadeChange(era.key)}
                  disabled={isPending}
                  className={`py-2 px-2 border rounded-md transition-colors cursor-pointer text-center truncate ${
                    isActive
                      ? "bg-stone-800 text-white border-stone-800 font-medium shadow-sm"
                      : "bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-300"
                  }`}
                >
                  {era.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Genre Filter */}
        <div className="space-y-1">
          <span className="block text-[10px] font-mono font-medium uppercase text-stone-500 tracking-wider">
            GENRE
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-xs font-mono uppercase">
            {DISCOVERY_GENRES.map((g) => {
              const isActive = selectedGenre === g.key;
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => handleGenreChange(g.key)}
                  disabled={isPending}
                  className={`py-2 px-1.5 border rounded-md transition-colors cursor-pointer text-center truncate ${
                    isActive
                      ? "bg-stone-800 text-white border-stone-800 font-medium shadow-sm"
                      : "bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-300"
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* =========================================================================
          RIGHT (80%) FRAME: Responsive Poster Grid / Empty State
          ========================================================================= */}
      <div className="flex-1 min-w-0 w-full space-y-4">
        {data.noRatedMedia && !activeSeed ? (
          <section className="border border-stone-300 rounded-md bg-stone-50 p-8 sm:p-12 text-center space-y-4 shadow-sm">
            <div className="font-mono text-xs text-stone-500 uppercase font-medium tracking-widest">
              [ RECOMMENDATION RADAR STANDBY ]
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-stone-900 font-bold tracking-tight">
              No Rated {mediaType === "movie" ? "Movies" : "TV Shows"} in Your
              Library
            </h2>
            <p className="max-w-md mx-auto text-xs sm:text-sm font-sans text-stone-600 leading-relaxed">
              Rate some {mediaType === "movie" ? "movies" : "TV shows"} in your
              library to start getting personalized recommendations.
            </p>
            <div className="pt-2">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-700 hover:bg-orange-800 text-white font-sans text-xs uppercase tracking-wider font-medium rounded-md shadow-sm transition-colors cursor-pointer"
              >
                ➔ Search Titles to Track &amp; Rate
              </Link>
            </div>
          </section>
        ) : filteredItems.length === 0 ? (
          <div className="border border-dashed border-stone-300 rounded-md p-8 bg-stone-50 text-center text-xs text-stone-500 space-y-2 shadow-sm font-sans">
            <div className="font-medium text-stone-700">
              NO RECOMMENDATIONS FOUND MATCHING THESE FILTERS.
            </div>
            <div className="text-stone-400">
              Try switching the era, selecting &quot;All Genres&quot;, or
              clicking &quot;I&apos;m Feeling Lucky&quot;.
            </div>
          </div>
        ) : (
          <>
            <div className={MEDIA_GRID_CLASS}>
              {filteredItems.map((item) => (
                <MediaCard
                  key={`${mediaType}-${item.tmdb_id}`}
                  media={item}
                  onStateChange={handleCardStateChange}
                />
              ))}
            </div>

            {/* Sentinel for Infinite Scroll (20 more on scroll) */}
            <div ref={sentinelRef} className="h-6 w-full" aria-hidden="true" />
            {isLoadingMore && (
              <div className="p-4 text-center font-mono text-xs uppercase text-stone-600 font-medium flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-stone-700 animate-pulse" />
                <span>LOADING 20 MORE RECOMMENDATIONS...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
