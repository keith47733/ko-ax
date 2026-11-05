"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import MediaCard from "@/components/MediaCard";
import ReleaseCalendar from "@/components/ReleaseCalendar";
import {
  MEDIA_GRID_CLASS,
  MediaType,
  MergedMediaItem,
  LocalViewMode,
} from "@/lib/types";

interface MainViewingPaneProps {
  initialItems: MergedMediaItem[];
  activeView: LocalViewMode;
  dataSource?: "supabase" | "wireframe-store";
}

const VIEW_LABELS: Record<LocalViewMode, string> = {
  library: "ALL MEDIA LIBRARY",
  want_to_watch: "WANT TO WATCH",
  watching: "CURRENTLY WATCHING",
  watched: "WATCHED & RATED",
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

  return (
    <div className="flex flex-col lg:flex-row gap-5 sm:gap-6 items-start w-full">
      {/* =====================================================================
          LEFT (20%) FRAME: Archival Minimalist Filter Console
          ===================================================================== */}
      <aside className="w-full lg:w-72 shrink-0 border border-stone-300 rounded-md bg-stone-50 p-4 shadow-sm space-y-4">
        {/* Frame Header with View Title & Count */}
        <div className="border-b border-stone-200 pb-3 flex items-center justify-between gap-2">
          <h2 className="font-serif text-sm sm:text-base font-bold text-stone-900 tracking-tight truncate">
            {VIEW_LABELS[activeView]}
          </h2>
          <span
            className={`text-xs font-mono font-medium px-2 py-0.5 rounded border border-stone-300 shrink-0 ${
              activeView === "want_to_watch"
                ? "bg-orange-700 text-white border-transparent"
                : activeView === "watched"
                ? "bg-emerald-800 text-white border-transparent"
                : activeView === "watching"
                ? "bg-stone-800 text-white border-transparent"
                : "bg-stone-200 text-stone-700"
            }`}
          >
            [{filteredAndSortedItems.length}]
          </span>
        </div>

        {/* 1. Title Filter */}
        <div>
          <input
            id="local-title-filter"
            type="text"
            value={localTitleFilter}
            onChange={(e) => setLocalTitleFilter(e.target.value)}
            placeholder="TYPE TO FILTER..."
            className="w-full h-9 border border-stone-300 rounded-md px-2.5 bg-stone-50 text-stone-900 text-xs sm:text-sm font-sans focus:outline-none focus:border-stone-500 placeholder:text-stone-400"
          />
        </div>

        {/* 2. Media Type Toggle */}
        <div className="space-y-1">
          <span className="block text-[10px] font-mono font-medium uppercase text-stone-500 tracking-wider">
            MEDIA TYPE
          </span>
          <div className="grid grid-cols-3 border border-stone-300 divide-x divide-stone-300 rounded-md overflow-hidden text-xs sm:text-sm font-mono uppercase text-center bg-stone-50 shadow-sm">
            <button
              type="button"
              onClick={() => setMediaTypeFilter("all")}
              className={`py-2 cursor-pointer transition-colors ${
                mediaTypeFilter === "all"
                  ? "bg-stone-800 text-white font-medium"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => setMediaTypeFilter("movie")}
              className={`py-2 cursor-pointer transition-colors ${
                mediaTypeFilter === "movie"
                  ? "bg-stone-800 text-white font-medium"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              MOVIES
            </button>
            <button
              type="button"
              onClick={() => setMediaTypeFilter("tv")}
              className={`py-2 cursor-pointer transition-colors ${
                mediaTypeFilter === "tv"
                  ? "bg-stone-800 text-white font-medium"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              TV
            </button>
          </div>
        </div>

        {/* 3. Minimum Rating Filter */}
        <div className="space-y-1">
          <span className="block text-[10px] font-mono font-medium uppercase text-stone-500 tracking-wider">
            MINIMUM RATING
          </span>
          <div className="grid grid-cols-4 border border-stone-300 divide-x divide-stone-300 rounded-md overflow-hidden text-xs sm:text-sm font-mono uppercase text-center bg-stone-50 shadow-sm">
            {[0, 7, 8, 9].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setMinRatingFilter(val)}
                className={`py-2 cursor-pointer transition-colors ${
                  minRatingFilter === val
                    ? "bg-stone-800 text-white font-medium"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                }`}
              >
                {val === 0 ? "ALL" : `${val}+`}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Sort By Field */}
        <div className="space-y-1">
          <span className="block text-[10px] font-mono font-medium uppercase text-stone-500 tracking-wider">
            SORT FIELD
          </span>
          <div className="grid grid-cols-3 border border-stone-300 divide-x divide-stone-300 rounded-md overflow-hidden text-xs sm:text-sm font-mono uppercase text-center bg-stone-50 shadow-sm">
            <button
              type="button"
              onClick={() => setSortBy("title")}
              className={`py-2 cursor-pointer transition-colors ${
                sortBy === "title"
                  ? "bg-stone-800 text-white font-medium"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              TITLE
            </button>
            <button
              type="button"
              onClick={() => setSortBy("updated_at")}
              className={`py-2 cursor-pointer transition-colors ${
                sortBy === "updated_at"
                  ? "bg-stone-800 text-white font-medium"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              DATE
            </button>
            <button
              type="button"
              onClick={() => setSortBy("rating")}
              className={`py-2 cursor-pointer transition-colors ${
                sortBy === "rating"
                  ? "bg-stone-800 text-white font-medium"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              RATING
            </button>
          </div>
        </div>

        {/* 5. Sort Direction */}
        <div className="space-y-1">
          <span className="block text-[10px] font-mono font-medium uppercase text-stone-500 tracking-wider">
            SORT ORDER
          </span>
          <div className="grid grid-cols-2 border border-stone-300 divide-x divide-stone-300 rounded-md overflow-hidden text-xs sm:text-sm font-mono uppercase text-center bg-stone-50 shadow-sm">
            <button
              type="button"
              onClick={() => setSortOrder("asc")}
              className={`py-2 cursor-pointer transition-colors ${
                sortOrder === "asc"
                  ? "bg-stone-800 text-white font-medium"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              ASC ↑ (A-Z)
            </button>
            <button
              type="button"
              onClick={() => setSortOrder("desc")}
              className={`py-2 cursor-pointer transition-colors ${
                sortOrder === "desc"
                  ? "bg-stone-800 text-white font-medium"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              DESC ↓ (Z-A)
            </button>
          </div>
        </div>
      </aside>

      {/* =====================================================================
          RIGHT (80%) FRAME: Responsive Poster Grid
          ===================================================================== */}
      <div className="flex-1 min-w-0 w-full">
        {items.length === 0 ? (
          <section className="border border-stone-300 rounded-md bg-stone-50 p-8 sm:p-12 text-center space-y-4 shadow-sm">
            <div className="font-mono text-xs text-stone-500 uppercase font-medium tracking-widest">
              [ TRACKER INITIALIZED • ZERO ENTRIES ]
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-stone-900 font-bold tracking-tight">
              Your Media Library is Empty
            </h2>
            <p className="max-w-md mx-auto text-xs sm:text-sm font-sans text-stone-600 leading-relaxed">
              Use the search bar above to start tracking movies and TV shows to build your archive and receive recommendations.
            </p>
            <div className="pt-2 flex justify-center">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-700 hover:bg-orange-800 text-white font-sans text-xs uppercase tracking-wider font-medium rounded-md shadow-sm transition-colors cursor-pointer"
              >
                ➔ Search Titles to Track
              </Link>
            </div>
          </section>
        ) : filteredAndSortedItems.length === 0 ? (
          <section className="border border-stone-300 rounded-md bg-stone-50 p-8 text-center text-xs space-y-2 shadow-sm text-stone-600 font-sans">
            <div className="font-medium text-stone-800">
              No media matches found in {VIEW_LABELS[activeView]}.
            </div>
            <div className="text-stone-500">
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
