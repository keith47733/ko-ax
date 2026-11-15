"use client";

import {
  FilterSearchInput,
  FilterSection,
  FilterSidebar,
  FilterSidebarHeader,
  SegmentedControl,
} from "@/components/FilterSidebar";
import {
  FilmIcon,
  ProjectorIcon,
  TvIcon,
} from "@/components/Icons";
import MediaCard from "@/components/MediaCard";
import MediaListItem from "@/components/MediaListItem";
import ViewModeToggle, { useViewMode } from "@/components/ViewModeToggle";
import {
  MEDIA_GRID_CLASS,
  MEDIA_LIST_CLASS,
  MediaType,
  MergedMediaItem,
  SearchResultsPaneProps,
} from "@/types";
import { useEffect, useMemo, useState } from "react";

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
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | MediaType>(
    "all",
  );
  const [libraryStatusFilter, setLibraryStatusFilter] = useState<
    "all" | "tracked" | "untracked"
  >("all");
  const [sortBy, setSortBy] = useState<"relevance" | "release_date" | "title">(
    "relevance",
  );
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [viewMode, setViewMode] = useViewMode();

  // When query is empty (e.g. navigated directly via SEARCH tab in header), auto-focus the global search bar
  useEffect(() => {
    if (query.length === 0) {
      const searchInput = document.getElementById(
        "global-search-input",
      ) as HTMLInputElement | null;
      if (searchInput) {
        searchInput.focus();
      }
    }
  }, [query]);

  const sortOrderLabels = useMemo(() => {
    switch (sortBy) {
      case "title":
        return { asc: "ASC ↑ (A-Z)", desc: "DESC ↓ (Z-A)" };
      case "release_date":
        return { asc: "OLDEST ↑", desc: "NEWEST ↓" };
      case "relevance":
      default:
        return { asc: "LOWEST ↑", desc: "HIGHEST ↓" };
    }
  }, [sortBy]);

  function handleMediaStateChange(updated: MergedMediaItem) {
    setItems((prev) =>
      prev.map((item) => (item.tmdb_id === updated.tmdb_id ? updated : item)),
    );
  }

  function handleSortByChange(newSort: "relevance" | "release_date" | "title") {
    setSortBy(newSort);
    if (newSort === "title") {
      setSortOrder("asc");
    } else {
      setSortOrder("desc");
    }
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

        if (sortBy === "release_date") {
          const dateA = a.release_date || a.next_air_date || "";
          const dateB = b.release_date || b.next_air_date || "";
          if (!dateA && !dateB) {
            return a.title.localeCompare(b.title);
          }
          if (!dateA) return 1;
          if (!dateB) return -1;
          const comparison = dateA.localeCompare(dateB);
          if (comparison === 0) return a.title.localeCompare(b.title);
          return sortOrder === "asc" ? comparison : -comparison;
        }

        if (sortBy === "title") {
          const comparison = a.title.localeCompare(b.title);
          return sortOrder === "asc" ? comparison : -comparison;
        }

        return 0;
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
    <div className="flex w-full flex-col items-start gap-5 sm:gap-6 lg:flex-row">
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
          <div className="flex items-center justify-between gap-2 rounded-xl bg-canvas p-3">
            <span className="font-mono text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
              QUERY:
            </span>
            <span className="truncate font-mono text-xs font-black text-zinc-900">
              &ldquo;{query}&rdquo;
            </span>
          </div>
        ) : (
          <div className="rounded-xl bg-canvas p-3 text-center">
            <span className="font-mono text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
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
            onChange={handleSortByChange}
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
              { value: "asc", label: sortOrderLabels.asc },
              { value: "desc", label: sortOrderLabels.desc },
            ]}
          />
        </FilterSection>
      </FilterSidebar>

      {/* =====================================================================
          RIGHT (80%) FRAME: Responsive Poster Grid / List View / Fallbacks
          ===================================================================== */}
      <main className="w-full min-w-0 flex-1 space-y-4">
        {query.length > 0 && filteredAndSortedItems.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="font-mono text-xs font-bold tracking-wider text-zinc-500 uppercase">
              SHOWING {filteredAndSortedItems.length}{" "}
              {filteredAndSortedItems.length === 1 ? "RESULT" : "RESULTS"}
            </span>

            {/* Quick Layout Mode Pill Toggle */}
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
          </div>
        )}

        {query.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 text-center font-mono text-xs font-semibold text-zinc-500 uppercase shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 sm:p-12 sm:text-sm">
            [ USE THE SEARCH BAR TO FIND A MOVIE OR TV SHOW ]
          </section>
        ) : filteredAndSortedItems.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 text-center font-mono text-xs text-zinc-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 sm:p-12 sm:text-sm">
            [ ZERO TMDB / LIBRARY MATCHES RESOLVED FOR &quot;{query}&quot; WITH
            CURRENT FILTERS ]
          </section>
        ) : viewMode === "list" ? (
          <section className={MEDIA_LIST_CLASS}>
            {filteredAndSortedItems.map((item) => (
              <MediaListItem
                key={`${item.media_type}-${item.tmdb_id}`}
                media={item}
                onStateChange={handleMediaStateChange}
              />
            ))}
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
