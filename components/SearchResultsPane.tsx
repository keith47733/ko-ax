"use client";

import React, { useState, useMemo } from "react";
import MediaCard from "@/components/MediaCard";
import { MEDIA_GRID_CLASS, MergedMediaItem, MediaType } from "@/lib/types";

interface SearchResultsPaneProps {
  query: string;
  initialItems: MergedMediaItem[];
}

export default function SearchResultsPane({
  query,
  initialItems,
}: SearchResultsPaneProps) {
  const [items, setItems] = useState<MergedMediaItem[]>(initialItems);
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);

  if (prevInitialItems !== initialItems) {
    setPrevInitialItems(initialItems);
    setItems(initialItems);
  }

  const [localTitleFilter, setLocalTitleFilter] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | MediaType>("all");
  const [libraryStatusFilter, setLibraryStatusFilter] = useState<
    "all" | "tracked" | "untracked"
  >("all");
  const [sortBy, setSortBy] = useState<"relevance" | "release_date" | "title">(
    "relevance"
  );
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  function handleMediaStateChange(updated: MergedMediaItem) {
    setItems((prev) =>
      prev.map((item) => (item.tmdb_id === updated.tmdb_id ? updated : item))
    );
  }

  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter((item) => {
        // 1. Media Type Filter
        if (mediaTypeFilter !== "all" && item.media_type !== mediaTypeFilter) {
          return false;
        }

        // 2. Library Status Filter
        const isTracked = !!item.status;
        if (libraryStatusFilter === "tracked" && !isTracked) {
          return false;
        }
        if (libraryStatusFilter === "untracked" && isTracked) {
          return false;
        }

        // 3. Local Sub-Title Filter
        if (localTitleFilter.trim()) {
          const match = item.title
            .toLowerCase()
            .includes(localTitleFilter.toLowerCase().trim());
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "relevance") {
          const indexA = items.indexOf(a);
          const indexB = items.indexOf(b);
          return sortOrder === "asc" ? indexB - indexA : indexA - indexB;
        }

        let comparison = 0;
        if (sortBy === "release_date") {
          comparison = (a.release_date || "").localeCompare(b.release_date || "");
        } else if (sortBy === "title") {
          comparison = a.title.localeCompare(b.title);
        }

        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [
    items,
    mediaTypeFilter,
    libraryStatusFilter,
    localTitleFilter,
    sortBy,
    sortOrder,
  ]);

  return (
    <div className="space-y-6">
      {/* Search Hero Header with 1-Tap Chip Toggles */}
      <section className="border border-stone-300 rounded-md bg-stone-50 p-3 sm:p-4 shadow-sm">
        <div>
          <span className="text-[10px] sm:text-xs uppercase font-mono font-medium text-stone-500 block">
            GLOBAL SEARCH
          </span>
          <h1 className="text-lg sm:text-xl font-serif font-bold text-stone-900 tracking-tight">
            {query
              ? `Results for "${query}" (${filteredAndSortedItems.length})`
              : `Search Results (${filteredAndSortedItems.length})`}
          </h1>
        </div>

        {/* 1-Tap Chip Toggles Bar */}
        <div className="pt-2.5 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
          {/* 1. Title Filter Input */}
          <div className="w-full sm:w-48 md:w-56 shrink-0">
            <input
              id="search-title-filter"
              type="text"
              value={localTitleFilter}
              onChange={(e) => setLocalTitleFilter(e.target.value)}
              placeholder="FILTER RESULTS..."
              className="w-full h-8 sm:h-8.5 border border-stone-300 rounded-md px-2.5 bg-stone-50 text-stone-900 text-xs font-sans focus:outline-none focus:border-stone-500 placeholder:text-stone-400"
            />
          </div>

          {/* 2. Media Type Chip Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-medium text-stone-500 uppercase shrink-0">
              MEDIA:
            </span>
            <div className="inline-flex border border-stone-300 divide-x divide-stone-300 rounded-md overflow-hidden text-[10px] sm:text-[11px] font-mono font-medium uppercase shadow-sm bg-stone-50">
              <button
                type="button"
                onClick={() => setMediaTypeFilter("all")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  mediaTypeFilter === "all"
                    ? "bg-stone-800 text-white"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                }`}
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() => setMediaTypeFilter("movie")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  mediaTypeFilter === "movie"
                    ? "bg-stone-800 text-white"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                }`}
              >
                MOVIES
              </button>
              <button
                type="button"
                onClick={() => setMediaTypeFilter("tv")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  mediaTypeFilter === "tv"
                    ? "bg-stone-800 text-white"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                }`}
              >
                TV
              </button>
            </div>
          </div>

          {/* 3. Library Status Chip Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-medium text-stone-500 uppercase shrink-0">
              STATUS:
            </span>
            <div className="inline-flex border border-stone-300 divide-x divide-stone-300 rounded-md overflow-hidden text-[10px] sm:text-[11px] font-mono font-medium uppercase shadow-sm bg-stone-50">
              <button
                type="button"
                onClick={() => setLibraryStatusFilter("all")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  libraryStatusFilter === "all"
                    ? "bg-stone-800 text-white"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                }`}
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() => setLibraryStatusFilter("tracked")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  libraryStatusFilter === "tracked"
                    ? "bg-stone-800 text-white"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                }`}
              >
                IN LIBRARY
              </button>
              <button
                type="button"
                onClick={() => setLibraryStatusFilter("untracked")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  libraryStatusFilter === "untracked"
                    ? "bg-stone-800 text-white"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                }`}
              >
                NEW / UNTRACKED
              </button>
            </div>
          </div>

          {/* 4. Sort By Field Chip Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-medium text-stone-500 uppercase shrink-0">
              SORT:
            </span>
            <div className="inline-flex border border-stone-300 divide-x divide-stone-300 rounded-md overflow-hidden text-[10px] sm:text-[11px] font-mono font-medium uppercase shadow-sm bg-stone-50">
              <button
                type="button"
                onClick={() => setSortBy("relevance")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  sortBy === "relevance"
                    ? "bg-stone-800 text-white"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                }`}
              >
                RELEVANCE
              </button>
              <button
                type="button"
                onClick={() => setSortBy("release_date")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  sortBy === "release_date"
                    ? "bg-stone-800 text-white"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                }`}
              >
                DATE
              </button>
              <button
                type="button"
                onClick={() => setSortBy("title")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  sortBy === "title"
                    ? "bg-stone-800 text-white"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                }`}
              >
                TITLE
              </button>
            </div>
          </div>

          {/* 5. Sort Direction Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-medium text-stone-500 uppercase shrink-0">
              DIR:
            </span>
            <div className="inline-flex border border-stone-300 divide-x divide-stone-300 rounded-md overflow-hidden text-[10px] sm:text-[11px] font-mono font-medium uppercase shadow-sm bg-stone-50">
              <button
                type="button"
                onClick={() => setSortOrder("desc")}
                title="Descending (Latest/Highest first)"
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  sortOrder === "desc"
                    ? "bg-stone-800 text-white"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100"
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
                    ? "bg-stone-800 text-white"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                }`}
              >
                ASC ↑
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Results Grid / Empty States */}
      {!query ? (
        <section className="border border-stone-300 rounded-md bg-stone-50 p-8 text-center text-xs font-mono text-stone-600 shadow-sm">
          TYPE A MOVIE OR TV SHOW TITLE IN THE HEADER SEARCH BAR AND PRESS ENTER.
        </section>
      ) : filteredAndSortedItems.length === 0 ? (
        <section className="border border-stone-300 rounded-md bg-stone-50 p-8 text-center text-xs font-mono text-stone-600 shadow-sm">
          {items.length === 0
            ? `NO TMDB MEDIA RESULTS FOUND FOR "${query}".`
            : `NO RESULTS MATCH THE CURRENT FILTERS.`}
        </section>
      ) : (
        <section>
          <div className={MEDIA_GRID_CLASS}>
            {filteredAndSortedItems.map((mergedItem) => (
              <MediaCard
                key={mergedItem.tmdb_id}
                media={mergedItem}
                onStateChange={handleMediaStateChange}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
