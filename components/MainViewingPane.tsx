"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import MediaCard from "@/components/MediaCard";
import MediaListItem from "@/components/MediaListItem";
import ReleaseCalendar from "@/components/ReleaseCalendar";
import {
  FilmIcon,
  ProjectorIcon,
  TvIcon,
} from "@/components/Icons";
import {
  FilterSearchInput,
  FilterSection,
  FilterSidebar,
  FilterSidebarHeader,
  SegmentedControl,
} from "@/components/FilterSidebar";
import ViewModeToggle, { useViewMode } from "@/components/ViewModeToggle";
import {
  LocalViewMode,
  MEDIA_GRID_CLASS,
  MEDIA_LIST_CLASS,
  MainViewSortBy,
  MainViewingPaneProps,
  MediaType,
  MergedMediaItem,
} from "@/types";

const VIEW_LABELS: Record<LocalViewMode, string> = {
  library: "ALL MEDIA LIBRARY",
  want_to_watch: "WANT TO WATCH",
  watching: "CURRENTLY WATCHING",
  watched: "WATCHED",
  calendar: "UPCOMING RELEASES (RADAR)",
};

export default function MainViewingPane({
  initialItems,
  activeView,
  dataSource,
}: MainViewingPaneProps) {
  const [items, setItems] = useState<MergedMediaItem[]>(initialItems);
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);

  if (prevInitialItems !== initialItems) {
    setPrevInitialItems(initialItems);
    setItems(initialItems);
  }

  const [prevActiveView, setPrevActiveView] = useState(activeView);
  const [localTitleFilter, setLocalTitleFilter] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | MediaType>(
    "all",
  );
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<MainViewSortBy>(
    activeView === "library" ? "title" : "added",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    activeView === "library" ? "asc" : "desc",
  );
  const [viewMode, setViewMode] = useViewMode();

  if (prevActiveView !== activeView) {
    setPrevActiveView(activeView);
    // Reset query and minimum rating filter when switching views to prevent unexpected empty screens
    setLocalTitleFilter("");
    setMinRatingFilter(0);
    // mediaTypeFilter is intentionally preserved across views
    if (activeView === "library") {
      setSortBy("title");
      setSortOrder("asc");
    } else {
      setSortBy("added");
      setSortOrder("desc");
    }
  }

  function handleSortByChange(newSort: MainViewSortBy) {
    setSortBy(newSort);
    if (newSort === "title") {
      setSortOrder("asc");
    } else {
      // Sensible default for date, added, and rating is descending (newest first, highest rated first)
      setSortOrder("desc");
    }
  }

  const sortOrderLabels = useMemo(() => {
    switch (sortBy) {
      case "title":
        return { asc: "ASC ↑ (A-Z)", desc: "DESC ↓ (Z-A)" };
      case "rating":
        return { asc: "LOWEST ↑", desc: "HIGHEST ↓" };
      case "added":
        return { asc: "OLDEST ↑", desc: "RECENT ↓" };
      case "date":
      default:
        return { asc: "OLDEST ↑", desc: "NEWEST ↓" };
    }
  }, [sortBy]);

  function handleCardStateChange(updated: MergedMediaItem) {
    setItems((prev) => {
      const exists = prev.some((i) => i.tmdb_id === updated.tmdb_id);
      if (!exists) {
        return [updated, ...prev];
      }
      return prev.map((item) =>
        item.tmdb_id === updated.tmdb_id ? { ...item, ...updated } : item,
      );
    });
  }

  const filteredAndSortedItems = useMemo(() => {
    if (activeView === "calendar") return items;

    return items
      .filter((item) => {
        if (activeView === "library") {
          return (
            item.status === "want_to_watch" ||
            item.status === "watching" ||
            item.status === "watched"
          );
        }
        return item.status === activeView;
      })
      .filter((item) =>
        mediaTypeFilter === "all" ? true : item.media_type === mediaTypeFilter,
      )
      .filter((item) => {
        if (minRatingFilter <= 0) return true;
        const imdbRating = item.tmdb_rating ?? 0;
        return imdbRating >= minRatingFilter;
      })
      .filter((item) =>
        localTitleFilter.trim()
          ? item.title
              .toLowerCase()
              .includes(localTitleFilter.trim().toLowerCase())
          : true,
      )
      .sort((a, b) => {
        if (sortBy === "title") {
          const comparison = a.title.localeCompare(b.title);
          return sortOrder === "asc" ? comparison : -comparison;
        }

        if (sortBy === "date") {
          const dateA = a.release_date || a.next_air_date || "";
          const dateB = b.release_date || b.next_air_date || "";

          // Items without release dates sort to the bottom in both directions
          if (!dateA && !dateB) {
            return a.title.localeCompare(b.title);
          }
          if (!dateA) return 1;
          if (!dateB) return -1;

          const comparison = dateA.localeCompare(dateB);
          if (comparison === 0) {
            return a.title.localeCompare(b.title);
          }
          return sortOrder === "asc" ? comparison : -comparison;
        }

        if (sortBy === "added") {
          const addedA = a.updated_at || "";
          const addedB = b.updated_at || "";

          // Items without added timestamp sort to the bottom in both directions
          if (!addedA && !addedB) {
            return a.title.localeCompare(b.title);
          }
          if (!addedA) return 1;
          if (!addedB) return -1;

          const comparison = addedA.localeCompare(addedB);
          if (comparison === 0) {
            return a.title.localeCompare(b.title);
          }
          return sortOrder === "asc" ? comparison : -comparison;
        }

        if (sortBy === "rating") {
          // Sort strictly by IMDb rating
          const ratingA = a.tmdb_rating ?? null;
          const ratingB = b.tmdb_rating ?? null;

          // Items with no IMDb rating sort to the bottom in both directions
          if (ratingA === null && ratingB === null) {
            return a.title.localeCompare(b.title);
          }
          if (ratingA === null) return 1;
          if (ratingB === null) return -1;

          const comparison = ratingA - ratingB;
          if (comparison === 0) {
            return a.title.localeCompare(b.title);
          }
          return sortOrder === "asc" ? comparison : -comparison;
        }

        return 0;
      });
  }, [
    items,
    activeView,
    mediaTypeFilter,
    minRatingFilter,
    localTitleFilter,
    sortBy,
    sortOrder,
  ]);

  if (activeView === "calendar") {
    return <ReleaseCalendar initialItems={items} dataSource={dataSource} />;
  }

  const countBadgeClass =
    activeView === "want_to_watch"
      ? "bg-coral text-zinc-950 shadow-sm shadow-orange-500/20"
      : activeView === "watched"
        ? "bg-mint text-emerald-950 shadow-sm shadow-emerald-500/20"
        : activeView === "watching"
          ? "bg-periwinkle text-indigo-950 shadow-sm shadow-indigo-500/20"
          : "bg-zinc-200 text-zinc-950";

  return (
    <div className="flex w-full flex-col items-start gap-5 sm:gap-6 lg:flex-row">
      {/* =====================================================================
          LEFT (20%) FRAME: Reusable Minimalist Filter Sidebar
          ===================================================================== */}
      <FilterSidebar>
        {/* Frame Header with View Title & Count */}
        <FilterSidebarHeader
          title={VIEW_LABELS[activeView]}
          count={filteredAndSortedItems.length}
          countBadgeClass={countBadgeClass}
        />

        {/* 1. Title Filter */}
        <div>
          <FilterSearchInput
            id="local-title-filter"
            value={localTitleFilter}
            onChange={(e) => setLocalTitleFilter(e.target.value)}
            placeholder="TYPE TO FILTER..."
          />
        </div>

        {/* 2. Media Type Toggle */}
        <FilterSection label="MEDIA TYPE">
          <SegmentedControl
            value={mediaTypeFilter}
            onChange={setMediaTypeFilter}
            options={[
              {
                value: "all",
                label: (
                  <span className="flex items-center justify-center gap-1 font-bold">
                    <FilmIcon className="h-4 w-4 shrink-0" />
                    <span>ALL</span>
                  </span>
                ),
              },
              {
                value: "movie",
                label: (
                  <span className="flex items-center justify-center gap-1 font-bold">
                    <ProjectorIcon className="h-4 w-4 shrink-0" />
                    <span>MOVIES</span>
                  </span>
                ),
              },
              {
                value: "tv",
                label: (
                  <span className="flex items-center justify-center gap-1 font-bold">
                    <TvIcon className="h-4 w-4 shrink-0" />
                    <span>TV</span>
                  </span>
                ),
              },
            ]}
          />
        </FilterSection>

        {/* 3. Minimum IMDb Rating Filter */}
        <FilterSection label="MINIMUM IMDB RATING">
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

        {/* 4. Sort By Field */}
        <FilterSection label="SORT FIELD">
          <SegmentedControl
            value={sortBy}
            onChange={handleSortByChange}
            columns={4}
            options={[
              { value: "title", label: "TITLE" },
              { value: "date", label: "DATE" },
              { value: "added", label: "ADDED" },
              { value: "rating", label: "RATING" },
            ]}
          />
        </FilterSection>

        {/* 5. Sort Direction */}
        <FilterSection label="SORT ORDER">
          <SegmentedControl
            value={sortOrder}
            onChange={setSortOrder}
            options={[
              { value: "asc", label: sortOrderLabels.asc },
              { value: "desc", label: sortOrderLabels.desc },
            ]}
          />
        </FilterSection>
      </FilterSidebar>

      {/* =====================================================================
          RIGHT (80%) FRAME: Responsive Poster Grid / List View
          ===================================================================== */}
      <div className="w-full min-w-0 flex-1 space-y-4">
        {filteredAndSortedItems.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="font-mono text-xs font-bold tracking-wider text-zinc-500 uppercase">
              SHOWING {filteredAndSortedItems.length}{" "}
              {filteredAndSortedItems.length === 1 ? "TITLE" : "TITLES"}
            </span>

            {/* Quick Layout Mode Pill Toggle */}
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
          </div>
        )}

        {items.length === 0 ? (
          <section className="space-y-4 rounded-2xl bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 sm:p-12">
            <div className="font-mono text-xs font-bold tracking-widest text-zinc-700 uppercase">
              [ TRACKER INITIALIZED • ZERO ENTRIES ]
            </div>
            <h2 className="font-sans text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              Your Media Library is Empty
            </h2>
            <p className="mx-auto max-w-md font-sans text-xs leading-relaxed font-medium text-zinc-700 sm:text-sm">
              Use the search bar above to start tracking movies and TV shows to
              build your archive and receive recommendations.
            </p>
            <div className="flex justify-center pt-2">
              <Link
                href="/search"
                className="bg-coral inline-flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3 font-sans text-xs font-black tracking-wider text-zinc-950 uppercase shadow-md shadow-orange-500/20 transition-all hover:brightness-95 active:scale-95"
              >
                ➔ Search Titles to Track
              </Link>
            </div>
          </section>
        ) : filteredAndSortedItems.length === 0 ? (
          <section className="space-y-2 rounded-2xl bg-white p-8 text-center font-sans text-xs text-zinc-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5">
            <div className="text-sm font-bold text-zinc-950">
              No media matches found in {VIEW_LABELS[activeView]}.
            </div>
            <div className="font-medium text-zinc-600">
              Adjust or reset your filters on the left to view titles.
            </div>
          </section>
        ) : viewMode === "list" ? (
          <section className={MEDIA_LIST_CLASS}>
            {filteredAndSortedItems.map((item) => (
              <MediaListItem
                key={item.tmdb_id}
                media={item}
                onStateChange={handleCardStateChange}
              />
            ))}
          </section>
        ) : (
          <section className={MEDIA_GRID_CLASS}>
            {filteredAndSortedItems.map((item) => (
              <MediaCard
                key={item.tmdb_id}
                media={item}
                onStateChange={handleCardStateChange}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
