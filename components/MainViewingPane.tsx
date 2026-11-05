"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import MediaCard from "@/components/MediaCard";
import ReleaseCalendar from "@/components/ReleaseCalendar";
import {
  FilterSearchInput,
  FilterSection,
  FilterSidebar,
  FilterSidebarHeader,
  SegmentedControl,
} from "@/components/FilterSidebar";
import {
  LocalViewMode,
  MEDIA_GRID_CLASS,
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
    "all"
  );
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"updated_at" | "title" | "rating">(
    activeView === "library" ? "title" : "updated_at"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    activeView === "library" ? "asc" : "desc"
  );

  if (prevActiveView !== activeView) {
    setPrevActiveView(activeView);
    if (activeView === "library") {
      setSortBy("title");
      setSortOrder("asc");
    } else {
      setSortBy("updated_at");
      setSortOrder("desc");
    }
  }

  function handleCardStateChange(updated: MergedMediaItem) {
    setItems((prev) => {
      const exists = prev.some((i) => i.tmdb_id === updated.tmdb_id);
      if (!exists) {
        return [updated, ...prev];
      }
      return prev.map((item) =>
        item.tmdb_id === updated.tmdb_id ? { ...item, ...updated } : item
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
        mediaTypeFilter === "all" ? true : item.media_type === mediaTypeFilter
      )
      .filter((item) =>
        minRatingFilter > 0 ? (item.rating ?? 0) >= minRatingFilter : true
      )
      .filter((item) =>
        localTitleFilter.trim()
          ? item.title
              .toLowerCase()
              .includes(localTitleFilter.trim().toLowerCase())
          : true
      )
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === "title") {
          comparison = a.title.localeCompare(b.title);
        } else if (sortBy === "rating") {
          comparison = (a.rating ?? 0) - (b.rating ?? 0);
        } else {
          comparison = (a.updated_at || "").localeCompare(b.updated_at || "");
        }
        return sortOrder === "asc" ? comparison : -comparison;
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
    return (
      <ReleaseCalendar initialItems={items} dataSource={dataSource} />
    );
  }

  const countBadgeClass =
    activeView === "want_to_watch"
      ? "bg-[#FF7A50] text-zinc-950 shadow-sm shadow-orange-500/20"
      : activeView === "watched"
      ? "bg-[#34D399] text-emerald-950 shadow-sm shadow-emerald-500/20"
      : activeView === "watching"
      ? "bg-[#818CF8] text-indigo-950 shadow-sm shadow-indigo-500/20"
      : "bg-zinc-200 text-zinc-950";

  return (
    <div className="flex flex-col lg:flex-row gap-5 sm:gap-6 items-start w-full">
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
              { value: "all", label: "ALL" },
              { value: "movie", label: "MOVIES" },
              { value: "tv", label: "TV" },
            ]}
          />
        </FilterSection>

        {/* 3. Minimum Rating Filter */}
        <FilterSection label="MINIMUM RATING">
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
            onChange={setSortBy}
            options={[
              { value: "title", label: "TITLE" },
              { value: "updated_at", label: "DATE" },
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
              { value: "asc", label: "ASC ↑ (A-Z)" },
              { value: "desc", label: "DESC ↓ (Z-A)" },
            ]}
          />
        </FilterSection>
      </FilterSidebar>

      {/* =====================================================================
          RIGHT (80%) FRAME: Responsive Poster Grid
          ===================================================================== */}
      <div className="flex-1 min-w-0 w-full">
        {items.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 sm:p-12 text-center space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5">
            <div className="font-mono text-xs text-zinc-700 uppercase font-bold tracking-widest">
              [ TRACKER INITIALIZED • ZERO ENTRIES ]
            </div>
            <h2 className="font-sans text-2xl sm:text-3xl text-zinc-950 font-bold tracking-tight">
              Your Media Library is Empty
            </h2>
            <p className="max-w-md mx-auto text-xs sm:text-sm font-sans text-zinc-700 leading-relaxed font-medium">
              Use the search bar above to start tracking movies and TV shows to build your archive and receive recommendations.
            </p>
            <div className="pt-2 flex justify-center">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF7A50] hover:brightness-95 text-zinc-950 font-sans text-xs uppercase tracking-wider font-black rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
              >
                ➔ Search Titles to Track
              </Link>
            </div>
          </section>
        ) : filteredAndSortedItems.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 text-center text-xs space-y-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-zinc-700 font-sans ring-1 ring-black/5">
            <div className="font-bold text-zinc-950 text-sm">
              No media matches found in {VIEW_LABELS[activeView]}.
            </div>
            <div className="text-zinc-600 font-medium">
              Adjust or reset your filters on the left to view titles.
            </div>
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
