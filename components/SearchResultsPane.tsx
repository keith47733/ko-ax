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
      <section className="border-2 border-black bg-white p-3 sm:p-4 rounded-xs">
        <div>
          <span className="text-[10px] sm:text-xs uppercase font-bold text-neutral-600 block">
            GLOBAL SEARCH
          </span>
          <h1 className="text-lg sm:text-xl font-bold uppercase">
            {query
              ? `RESULTS FOR "${query}" (${filteredAndSortedItems.length})`
              : `SEARCH RESULTS (${filteredAndSortedItems.length})`}
          </h1>
        </div>

        {/* 1-Tap Chip Toggles Bar */}
        <div className="pt-2.5 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs uppercase">
          {/* 1. Title Filter Input */}
          <div className="w-full sm:w-48 md:w-56 shrink-0">
            <input
              id="search-title-filter"
              type="text"
              value={localTitleFilter}
              onChange={(e) => setLocalTitleFilter(e.target.value)}
              placeholder="FILTER RESULTS..."
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

          {/* 3. Library Status Chip Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[10px] text-neutral-500 shrink-0">
              STATUS:
            </span>
            <div className="inline-flex border-2 border-black divide-x-2 divide-black rounded-xs overflow-hidden text-[10px] sm:text-[11px] font-bold uppercase">
              <button
                type="button"
                onClick={() => setLibraryStatusFilter("all")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  libraryStatusFilter === "all"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() => setLibraryStatusFilter("tracked")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  libraryStatusFilter === "tracked"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                IN LIBRARY
              </button>
              <button
                type="button"
                onClick={() => setLibraryStatusFilter("untracked")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  libraryStatusFilter === "untracked"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                NEW / UNTRACKED
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
                onClick={() => setSortBy("relevance")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  sortBy === "relevance"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                RELEVANCE
              </button>
              <button
                type="button"
                onClick={() => setSortBy("release_date")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  sortBy === "release_date"
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

      {/* Results Grid / Empty States */}
      {!query ? (
        <section className="border-2 border-black bg-white p-8 text-center text-xs uppercase font-bold">
          TYPE A MOVIE OR TV SHOW TITLE IN THE HEADER SEARCH BAR AND PRESS ENTER.
        </section>
      ) : filteredAndSortedItems.length === 0 ? (
        <section className="border-2 border-black bg-white p-8 text-center text-xs uppercase font-bold">
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

