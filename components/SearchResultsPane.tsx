"use client";

import React, { useState, useMemo } from "react";
import MediaCard from "@/components/MediaCard";
import {
  FilterSidebar,
  FilterSidebarHeader,
  FilterSection,
  FilterSearchInput,
  SegmentedControl,
} from "@/components/FilterSidebar";
import { MEDIA_GRID_CLASS, MergedMediaItem, MediaType, SearchResultsPaneProps } from "@/types";

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
    <div className="flex flex-col lg:flex-row gap-5 sm:gap-6 items-start w-full">
      {/* =====================================================================
          LEFT (20%) FRAME: Search Filter Sidebar Console
          ===================================================================== */}
      <FilterSidebar>
        {/* Frame Header with View Title & Count */}
        <FilterSidebarHeader
          title="SEARCH RESULTS"
          count={filteredAndSortedItems.length}
        />

        {/* Query Status Callout */}
        {query ? (
          <div className="p-3 bg-[#F4F3F0] rounded-xl flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
              QUERY:
            </span>
            <span className="text-xs font-mono font-black text-zinc-900 truncate">
              &ldquo;{query}&rdquo;
            </span>
          </div>
        ) : (
          <div className="p-3 bg-[#F4F3F0] rounded-xl text-center">
            <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
              NO ACTIVE QUERY
            </span>
          </div>
        )}

        {/* 1. Title Filter Input */}
        <div>
          <FilterSearchInput
            id="search-title-filter"
            value={localTitleFilter}
            onChange={(e) => setLocalTitleFilter(e.target.value)}
            placeholder="FILTER RESULTS..."
          />
        </div>

        {/* 2. Media Type Chip Toggle */}
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

        {/* 3. Library Status Chip Toggle */}
        <FilterSection label="LIBRARY STATUS">
          <SegmentedControl
            value={libraryStatusFilter}
            onChange={setLibraryStatusFilter}
            options={[
              { value: "all", label: "ALL" },
              { value: "tracked", label: "IN LIB" },
              { value: "untracked", label: "NEW" },
            ]}
          />
        </FilterSection>

        {/* 4. Sort By Field Chip Toggle */}
        <FilterSection label="SORT FIELD">
          <SegmentedControl
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "relevance", label: "RELEVANCE" },
              { value: "release_date", label: "DATE" },
              { value: "title", label: "TITLE" },
            ]}
          />
        </FilterSection>

        {/* 5. Sort Direction Toggle */}
        <FilterSection label="SORT ORDER">
          <SegmentedControl
            value={sortOrder}
            onChange={setSortOrder}
            options={[
              { value: "desc", label: "DESC ↓" },
              { value: "asc", label: "ASC ↑" },
            ]}
          />
        </FilterSection>
      </FilterSidebar>

      {/* =====================================================================
          RIGHT (80%) FRAME: Responsive Poster Grid / Fallbacks
          ===================================================================== */}
      <main className="flex-1 w-full min-w-0">
        {query.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 sm:p-12 text-center text-xs sm:text-sm font-mono text-zinc-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5">
            [ TYPE A TITLE OR ACTOR IN THE TOP SEARCH BAR TO QUERY TMDB REPOSITORY ]
          </section>
        ) : filteredAndSortedItems.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 sm:p-12 text-center text-xs sm:text-sm font-mono text-zinc-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5">
            [ ZERO TMDB / LIBRARY MATCHES RESOLVED FOR &quot;{query}&quot; WITH CURRENT FILTERS ]
          </section>
        ) : (
          <section className={MEDIA_GRID_CLASS}>
            {filteredAndSortedItems.map((item) => (
              <MediaCard
                key={`${item.media_type}-${item.tmdb_id}`}
                media={item}
                onStateChange={handleMediaStateChange}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
