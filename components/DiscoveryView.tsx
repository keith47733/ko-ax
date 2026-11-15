"use client";

import { getDiscoveryRecommendationsAction } from "@/app/actions/media";
import {
  FilterSearchInput,
  FilterSection,
  FilterSidebar,
  FilterSidebarHeader,
  SegmentedControl,
} from "@/components/FilterSidebar";
import {
  ProjectorIcon,
  TvIcon,
} from "@/components/Icons";
import LoadingSpinner from "@/components/LoadingSpinner";
import MediaCard from "@/components/MediaCard";
import MediaListItem from "@/components/MediaListItem";
import ViewModeToggle, { useViewMode } from "@/components/ViewModeToggle";
import {
  DISCOVERY_ERAS,
  DISCOVERY_GENRES,
  DiscoveryEngineResult,
  DiscoveryViewProps,
  MEDIA_GRID_CLASS,
  MEDIA_LIST_CLASS,
  MediaType,
  MergedMediaItem,
} from "@/types";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

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
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [localTitleFilter, setLocalTitleFilter] = useState<string>("");
  const [currentSeedId, setCurrentSeedId] = useState<number | undefined>(
    seedId,
  );
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useViewMode();

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
    setMinRatingFilter(0);
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
    loadRecommendations({ mediaType: nextType, seedId: null });
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

  // Clear active seed from 'FIND SIMILAR' and return to general discovery with active filters
  function handleClearSeed() {
    setCurrentSeedId(undefined);
    updateUrl(mediaType, selectedGenre, selectedDecade);
    loadRecommendations({ seedId: null });
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

  // Local title and rating filtering
  const filteredItems = useMemo(() => {
    let suggestions = data.suggestions ?? [];
    if (minRatingFilter > 0) {
      suggestions = suggestions.filter(
        (m) => (m.tmdb_rating ?? 0) >= minRatingFilter,
      );
    }
    const query = localTitleFilter.trim().toLowerCase();
    if (query) {
      suggestions = suggestions.filter((m) =>
        m.title.toLowerCase().includes(query),
      );
    }
    return [...suggestions].sort(
      (a, b) => (b.tmdb_rating ?? 0) - (a.tmdb_rating ?? 0),
    );
  }, [data.suggestions, minRatingFilter, localTitleFilter]);

  const activeSeed = data.seed;
  const isSeeded = Boolean(currentSeedId || (activeSeed && activeSeed.id > 0));

  return (
    <div className="flex w-full flex-col items-start gap-5 sm:gap-6 lg:flex-row">
      {/* =========================================================================
          LEFT (20%) FRAME: High-Pop Minimalist Discovery Filter Console
          ========================================================================= */}
      <FilterSidebar>
        {/* Frame Header with View Title & Count */}
        <FilterSidebarHeader
          title="DISCOVER RADAR"
          count={filteredItems.length}
        />

        {/* 1. Title Filter Input */}
        <div>
          <FilterSearchInput
            id="discovery-title-filter"
            value={localTitleFilter}
            onChange={(e) => setLocalTitleFilter(e.target.value)}
            placeholder="FILTER TITLES..."
          />
        </div>

        {/* 2. Media Type Toggle */}
        <FilterSection label="MEDIA TYPE">
          <SegmentedControl
            value={mediaType}
            onChange={(val) => handleTypeSwitch(val as MediaType)}
            options={[
              {
                value: "movie",
                label: (
                  <span className="flex items-center justify-center gap-1.5 font-bold">
                    <ProjectorIcon className="h-4 w-4 shrink-0 text-black stroke-[2.2]" />
                    <span>MOVIES</span>
                  </span>
                ),
              },
              {
                value: "tv",
                label: (
                  <span className="flex items-center justify-center gap-1.5 font-bold">
                    <TvIcon className="h-4 w-4 shrink-0 text-black stroke-[2.2]" />
                    <span>TV</span>
                  </span>
                ),
              },
            ]}
          />
        </FilterSection>

        {/* Seed Mode Quick Escape (when arrived via 'FIND SIMILAR') */}
        {isSeeded && (
          <button
            type="button"
            onClick={handleClearSeed}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white p-3 font-mono text-xs font-bold text-zinc-950 shadow-sm transition-all duration-150 hover:bg-zinc-800 hover:border-zinc-800 hover:text-white hover:scale-[1.01] active:scale-[0.99]"
            title="Switch from similar title recommendations to popular & high-rated discovery"
          >
            <span>➔ EXPLORE POPULAR &amp; HIGH-RATED</span>
          </button>
        )}

        {/* 3. Minimum TMDB Rating Filter (disabled in seeded mode) */}
        <div
          className={
            isSeeded
              ? "opacity-35 pointer-events-none select-none transition-opacity"
              : "transition-opacity"
          }
        >
          <FilterSection label="MINIMUM TMDB RATING">
            <SegmentedControl
              value={minRatingFilter}
              onChange={setMinRatingFilter}
              columns={4}
              options={[
                { value: 0, label: "ALL" },
                { value: 7, label: "7+" },
                { value: 8, label: "8+" },
                { value: 9, label: "9+" },
              ]}
            />
          </FilterSection>
        </div>

        {/* 4. Release Era Filter (disabled/greyed out in seeded mode) */}
        <div
          className={
            isSeeded
              ? "opacity-35 pointer-events-none select-none transition-opacity"
              : "transition-opacity"
          }
        >
          <FilterSection label="RELEASE ERA">
            <div className="grid grid-cols-2 gap-1.5 font-mono text-xs uppercase sm:text-sm">
              {DISCOVERY_ERAS.map((era) => {
                const isActive = selectedDecade === era.key;
                return (
                  <button
                    key={era.key}
                    type="button"
                    onClick={() => handleDecadeChange(era.key)}
                    disabled={isPending || isSeeded}
                    className={`cursor-pointer truncate rounded-xl px-2 py-2 text-center font-bold transition-all ${
                      isActive
                        ? "bg-zinc-800 text-white shadow-sm hover:bg-zinc-700"
                        : "bg-canvas font-medium text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {era.label}
                  </button>
                );
              })}
            </div>
          </FilterSection>
        </div>

        {/* 5. Genre Filter (disabled/greyed out in seeded mode) */}
        <div
          className={
            isSeeded
              ? "opacity-35 pointer-events-none select-none transition-opacity"
              : "transition-opacity"
          }
        >
          <FilterSection label="GENRE">
            <div className="grid grid-cols-2 gap-1.5 font-mono text-xs uppercase sm:text-sm">
              {DISCOVERY_GENRES.map((g) => {
                const isActive = selectedGenre === g.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => handleGenreChange(g.key)}
                    disabled={isPending || isSeeded}
                    className={`cursor-pointer truncate rounded-xl px-1.5 py-2 text-center font-bold transition-all ${
                      isActive
                        ? "bg-zinc-800 text-white shadow-sm hover:bg-zinc-700"
                        : "bg-canvas font-medium text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </FilterSection>
        </div>
      </FilterSidebar>

      {/* =========================================================================
          RIGHT (80%) FRAME: Responsive Poster Grid / List View / Empty State
          ========================================================================= */}
      <div className="w-full min-w-0 flex-1 space-y-4">
        {/* Unified Header Strip: Context Title & Count (Left) + Quick Layout Mode Pill (Right) */}
        {!data.noRatedMedia && filteredItems.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate font-mono text-xs font-bold tracking-wider text-zinc-500 uppercase">
                {isSeeded && activeSeed ? (
                  <>
                    SIMILAR TO{" "}
                    <span className="font-black text-zinc-900">
                      {activeSeed.title.toUpperCase()}
                    </span>{" "}
                    ({filteredItems.length}{" "}
                    {filteredItems.length === 1 ? "TITLE" : "TITLES"})
                  </>
                ) : (
                  <>
                    POPULAR &amp; HIGH-RATED{" "}
                    <span className="font-black text-zinc-900">
                      {mediaType === "movie" ? "MOVIES" : "TV SHOWS"}
                    </span>{" "}
                    ({filteredItems.length}{" "}
                    {filteredItems.length === 1 ? "TITLE" : "TITLES"})
                  </>
                )}
              </span>
            </div>

            {/* Quick Layout Mode Pill Toggle */}
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
          </div>
        )}

        {data.noRatedMedia && !activeSeed ? (
          <section className="space-y-4 rounded-2xl bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 sm:p-12">
            <div className="font-mono text-xs font-bold tracking-widest text-zinc-700 uppercase">
              [ RECOMMENDATION RADAR STANDBY ]
            </div>
            <h2 className="font-sans text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              No Rated {mediaType === "movie" ? "Movies" : "TV Shows"} in Your
              Library
            </h2>
            <p className="mx-auto max-w-md font-sans text-xs leading-relaxed font-medium text-zinc-700 sm:text-sm">
              Rate some {mediaType === "movie" ? "movies" : "TV shows"} in your
              library to start getting personalized recommendations.
            </p>
            <div className="pt-2">
              <Link
                href="/search"
                className="bg-coral inline-flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3 font-sans text-xs font-black tracking-wider text-zinc-950 uppercase shadow-md shadow-orange-500/20 transition-all hover:brightness-95 active:scale-95"
              >
                ➔ Search Titles to Track &amp; Rate
              </Link>
            </div>
          </section>
        ) : filteredItems.length === 0 ? (
          <div className="space-y-2 rounded-2xl bg-white p-8 text-center font-sans text-xs text-zinc-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5">
            <div className="text-sm font-bold text-zinc-950">
              NO RECOMMENDATIONS FOUND MATCHING THESE FILTERS.
            </div>
            <div className="font-medium text-zinc-600">
              Try lowering the minimum rating, switching the era, selecting &quot;All Genres&quot;, or
              clicking &quot;I&apos;m Feeling Lucky&quot;.
            </div>
          </div>
        ) : (
          <>
            {viewMode === "list" ? (
              <div className={MEDIA_LIST_CLASS}>
                {filteredItems.map((item) => (
                  <MediaListItem
                    key={`${mediaType}-${item.tmdb_id}`}
                    media={item}
                    onStateChange={handleCardStateChange}
                  />
                ))}
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

            {/* Sentinel for Infinite Scroll (20 more on scroll) */}
            <div ref={sentinelRef} className="h-6 w-full" aria-hidden="true" />
            {isLoadingMore && (
              <div className="flex items-center justify-center py-6">
                <LoadingSpinner size="md" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
