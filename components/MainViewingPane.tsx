"use client";

import React, { useMemo, useState } from "react";
import MediaCard from "@/components/MediaCard";
import ReleaseCalendar from "@/components/ReleaseCalendar";
import {
  MEDIA_GRID_CLASS,
  MediaStatus,
  MediaType,
  MergedMediaItem,
} from "@/lib/types";

export type LocalViewMode = MediaStatus | "calendar";

interface MainViewingPaneProps {
  initialItems: MergedMediaItem[];
  activeView: LocalViewMode;
  dataSource: "supabase" | "wireframe-store";
}

const VIEW_LABELS: Record<LocalViewMode, string> = {
  want_to_watch: "WANT TO WATCH",
  watching: "CURRENTLY WATCHING",
  watched: "WATCHED & RATED",
  calendar: "RELEASE CALENDAR (RADAR)",
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

  const [localTitleFilter, setLocalTitleFilter] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | MediaType>(
    "all"
  );
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"updated_at" | "title" | "rating">(
    "updated_at"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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
      .filter((item) => item.status === activeView)
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
    <div className="space-y-6">
      {/* Top Status View Hero with 1-Tap Chip Toggles */}
      <section className="border-2 border-black bg-white p-3 sm:p-4 rounded-xs">
        <div>
          <span className="text-[10px] sm:text-xs uppercase font-bold text-neutral-600 block">
            MEDIA TRACKER
          </span>
          <h1 className="text-lg sm:text-xl font-bold uppercase">
            {VIEW_LABELS[activeView]} ({filteredAndSortedItems.length})
          </h1>
        </div>

        {/* 1-Tap Chip Toggles Bar (Saves Vertical Space & Mobile Clicks) */}
        <div className="pt-2.5 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs uppercase">
          {/* 1. Local Title Filter */}
          <div className="w-full sm:w-48 md:w-56 shrink-0">
            <input
              id="local-title-filter"
              type="text"
              value={localTitleFilter}
              onChange={(e) => setLocalTitleFilter(e.target.value)}
              placeholder="FILTER TITLE..."
              className="w-full h-8 sm:h-8.5 border-2 border-black px-2.5 bg-white text-black text-xs font-bold uppercase rounded-xs focus:outline-none placeholder:text-neutral-400 placeholder:font-normal"
            />
          </div>

          {/* 2. Media Type Chip Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[10px] text-neutral-500 shrink-0">
              MEDIA:
            </span>
            <div className="inline-flex border-2 border-black divide-x-2 divide-black rounded-xs overflow-hidden text-[10px] sm:text-[11px] font-bold uppercase">
              <button
                type="button"
                onClick={() => setMediaTypeFilter("all")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  mediaTypeFilter === "all"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() => setMediaTypeFilter("movie")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  mediaTypeFilter === "movie"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                MOVIES
              </button>
              <button
                type="button"
                onClick={() => setMediaTypeFilter("tv")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  mediaTypeFilter === "tv"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                TV
              </button>
            </div>
          </div>

          {/* 3. Minimum Rating Chip Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[10px] text-neutral-500 shrink-0">
              RATING:
            </span>
            <div className="inline-flex border-2 border-black divide-x-2 divide-black rounded-xs overflow-hidden text-[10px] sm:text-[11px] font-bold uppercase">
              <button
                type="button"
                onClick={() => setMinRatingFilter(0)}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  minRatingFilter === 0
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() => setMinRatingFilter(7)}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  minRatingFilter === 7
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                7+
              </button>
              <button
                type="button"
                onClick={() => setMinRatingFilter(8)}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  minRatingFilter === 8
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                8+
              </button>
              <button
                type="button"
                onClick={() => setMinRatingFilter(9)}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  minRatingFilter === 9
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                9+
              </button>
            </div>
          </div>

          {/* 4. Sort By Field Chip Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[10px] text-neutral-500 shrink-0">
              SORT:
            </span>
            <div className="inline-flex border-2 border-black divide-x-2 divide-black rounded-xs overflow-hidden text-[10px] sm:text-[11px] font-bold uppercase">
              <button
                type="button"
                onClick={() => setSortBy("updated_at")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  sortBy === "updated_at"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                DATE
              </button>
              <button
                type="button"
                onClick={() => setSortBy("title")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  sortBy === "title"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                TITLE
              </button>
              <button
                type="button"
                onClick={() => setSortBy("rating")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  sortBy === "rating"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                RATING
              </button>
            </div>
          </div>

          {/* 5. Sort Direction Toggle (Option B: Dedicated Buttons) */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[10px] text-neutral-500 shrink-0">
              DIR:
            </span>
            <div className="inline-flex border-2 border-black divide-x-2 divide-black rounded-xs overflow-hidden text-[10px] sm:text-[11px] font-bold uppercase">
              <button
                type="button"
                onClick={() => setSortOrder("desc")}
                title="Descending (Latest/Highest first)"
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  sortOrder === "desc"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                DESC ↓
              </button>
              <button
                type="button"
                onClick={() => setSortOrder("asc")}
                title="Ascending (Earliest/Lowest first)"
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  sortOrder === "asc"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                ASC ↑
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Responsive CSS Grid of Unified Media Cards */}
      {filteredAndSortedItems.length === 0 ? (
        <section className="border-2 border-black bg-white p-8 text-center text-xs uppercase space-y-2">
          <div className="font-bold">
            NO MEDIA IN {VIEW_LABELS[activeView]}.
          </div>
          <div className="text-neutral-600">
            USE THE SEARCH BAR ABOVE TO FIND AND ADD MOVIES OR TV SHOWS.
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
  );
}

