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
  FilterSearchInput,
  FilterSection,
  FilterSidebar,
  FilterSidebarHeader,
  SegmentedControl,
} from "@/components/FilterSidebar";
import {
  DISCOVERY_ERAS,
  DISCOVERY_GENRES,
  DiscoveryEngineResult,
  DiscoveryViewProps,
  MEDIA_GRID_CLASS,
  MediaType,
  MergedMediaItem,
} from "@/types";

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
          LEFT (20%) FRAME: High-Pop Minimalist Discovery Filter Console
          ========================================================================= */}
      <FilterSidebar>
        {/* Frame Header with View Title & Count */}
        <FilterSidebarHeader
          title="DISCOVER RADAR"
          count={filteredItems.length}
        />

        {/* 1. Engine Switcher: Movies vs TV Shows */}
        <SegmentedControl
          value={mediaType}
          onChange={(val) => handleTypeSwitch(val)}
          options={[
            {
              value: "movie",
              label: (
                <span className="flex items-center justify-center gap-1.5 font-bold">
                  <FilmIcon className="w-4.5 h-4.5 shrink-0" />
                  <span>MOVIES</span>
                </span>
              ),
            },
            {
              value: "tv",
              label: (
                <span className="flex items-center justify-center gap-1.5 font-bold">
                  <TvIcon className="w-4.5 h-4.5 shrink-0" />
                  <span>TV SHOWS</span>
                </span>
              ),
            },
          ]}
        />

        {/* 2. Seed Block ("Similar to {Title}" + "I'M FEELING LUCKY" text button) */}
        <div className="p-4 bg-[#F4F3F0] rounded-2xl space-y-2">
          <span className="text-xs font-mono uppercase font-bold text-zinc-600 block leading-none">
            RECOMMENDATIONS:
          </span>
          <div className="flex items-baseline justify-between gap-1.5">
            <span className="font-sans text-xs sm:text-sm font-bold tracking-tight text-zinc-950 truncate">
              SIMILAR TO{" "}
              {activeSeed?.title ||
                (mediaType === "movie" ? "TOP MOVIES" : "TOP SHOWS")}
            </span>
            {isUrlSeeded && (
              <button
                type="button"
                onClick={handleResetAutoPilot}
                className="text-xs font-mono font-bold text-zinc-600 hover:text-zinc-950 underline cursor-pointer shrink-0"
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
            className="text-xs font-mono font-black uppercase text-[#FF7A50] hover:brightness-90 underline flex items-center gap-1 cursor-pointer pt-0.5 transition-colors"
            title="Pick another random 8+ rated title to seed recommendations"
          >
            <span>➔ I&apos;M FEELING LUCKY (NEW SEED)</span>
          </button>
        </div>

        {/* 3. Filter by Title */}
        <div>
          <FilterSearchInput
            id="discovery-title-filter"
            value={localTitleFilter}
            onChange={(e) => setLocalTitleFilter(e.target.value)}
            placeholder={`FILTER ${mediaType === "movie" ? "MOVIES" : "SHOWS"}...`}
          />
        </div>

        {/* 4. Release Era Filter */}
        <FilterSection label="RELEASE ERA">
          <div className="grid grid-cols-2 gap-1.5 text-xs sm:text-sm font-mono uppercase">
            {DISCOVERY_ERAS.map((era) => {
              const isActive = selectedDecade === era.key;
              return (
                <button
                  key={era.key}
                  type="button"
                  onClick={() => handleDecadeChange(era.key)}
                  disabled={isPending}
                  className={`py-2 px-2 rounded-xl transition-all cursor-pointer text-center truncate font-bold ${
                    isActive
                      ? "bg-zinc-800 hover:bg-zinc-700 text-white shadow-sm"
                      : "bg-[#F4F3F0] text-zinc-600 hover:bg-zinc-200 font-medium"
                  }`}
                >
                  {era.label}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* 5. Genre Filter */}
        <FilterSection label="GENRE">
          <div className="grid grid-cols-2 gap-1.5 text-xs sm:text-sm font-mono uppercase">
            {DISCOVERY_GENRES.map((g) => {
              const isActive = selectedGenre === g.key;
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => handleGenreChange(g.key)}
                  disabled={isPending}
                  className={`py-2 px-1.5 rounded-xl transition-all cursor-pointer text-center truncate font-bold ${
                    isActive
                      ? "bg-zinc-800 hover:bg-zinc-700 text-white shadow-sm"
                      : "bg-[#F4F3F0] text-zinc-600 hover:bg-zinc-200 font-medium"
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </FilterSection>
      </FilterSidebar>

      {/* =========================================================================
          RIGHT (80%) FRAME: Responsive Poster Grid / Empty State
          ========================================================================= */}
      <div className="flex-1 min-w-0 w-full space-y-4">
        {data.noRatedMedia && !activeSeed ? (
          <section className="rounded-2xl bg-white p-8 sm:p-12 text-center space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5">
            <div className="font-mono text-xs text-zinc-700 uppercase font-bold tracking-widest">
              [ RECOMMENDATION RADAR STANDBY ]
            </div>
            <h2 className="font-sans text-2xl sm:text-3xl text-zinc-950 font-bold tracking-tight">
              No Rated {mediaType === "movie" ? "Movies" : "TV Shows"} in Your
              Library
            </h2>
            <p className="max-w-md mx-auto text-xs sm:text-sm font-sans text-zinc-700 leading-relaxed font-medium">
              Rate some {mediaType === "movie" ? "movies" : "TV shows"} in your
              library to start getting personalized recommendations.
            </p>
            <div className="pt-2">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF7A50] hover:brightness-95 text-zinc-950 font-sans text-xs uppercase tracking-wider font-black rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
              >
                ➔ Search Titles to Track &amp; Rate
              </Link>
            </div>
          </section>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl p-8 bg-white text-center text-xs text-zinc-700 space-y-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] font-sans ring-1 ring-black/5">
            <div className="font-bold text-zinc-950 text-sm">
              NO RECOMMENDATIONS FOUND MATCHING THESE FILTERS.
            </div>
            <div className="text-zinc-600 font-medium">
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
              <div className="p-4 text-center font-mono text-xs uppercase text-zinc-600 font-medium flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zinc-700 animate-pulse" />
                <span>LOADING 20 MORE RECOMMENDATIONS...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
