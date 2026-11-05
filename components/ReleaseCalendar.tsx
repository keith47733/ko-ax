"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import MediaCard from "@/components/MediaCard";
import {
  FilterSearchInput,
  FilterSection,
  FilterSidebar,
  FilterSidebarHeader,
  SegmentedControl,
} from "@/components/FilterSidebar";
import {
  DateGroup,
  MEDIA_GRID_CLASS,
  MediaType,
  MergedMediaItem,
  ReleaseCalendarProps,
  TimeHorizon,
} from "@/types";
import { formatDateBanner, getItemDate } from "@/lib/utils";

const TIME_HORIZONS: Array<{ key: TimeHorizon; label: string }> = [
  { key: "upcoming", label: "UPCOMING" },
  { key: "next_30", label: "NEXT 30 DAYS" },
  { key: "next_90", label: "NEXT 90 DAYS" },
  { key: "all", label: "ALL FUTURE" },
  { key: "past", label: "PAST RELEASES" },
];

export default function ReleaseCalendar({
  initialItems,
}: ReleaseCalendarProps) {
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
  const [queueFilter, setQueueFilter] = useState<
    "all" | "watching" | "want_to_watch"
  >("all");
  const [timeHorizonFilter, setTimeHorizonFilter] = useState<TimeHorizon>("upcoming");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Progressive reveal / Lazy load pagination for date groups
  const [visibleDateLimit, setVisibleDateLimit] = useState<number>(4);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  function handleCardStateChange(updated: MergedMediaItem) {
    setItems((prev) =>
      prev.map((item) => (item.tmdb_id === updated.tmdb_id ? updated : item)),
    );
  }

  // Filter and group items into chronological date groups
  const dateGroups: DateGroup[] = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    // 30 and 90 day thresholds
    const now = new Date();
    const plus30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const plus90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // Filter relevant items (only items in WANT or WATCHING that have a valid date)
    const validItems = items.filter((item) => {
      // Must be queued in want_to_watch or watching
      if (item.status !== "want_to_watch" && item.status !== "watching") {
        return false;
      }

      // Queue filter
      if (queueFilter !== "all" && item.status !== queueFilter) {
        return false;
      }

      // Media type filter
      if (mediaTypeFilter !== "all" && item.media_type !== mediaTypeFilter) {
        return false;
      }

      // Local title filter
      if (
        localTitleFilter.trim() &&
        !item.title.toLowerCase().includes(localTitleFilter.trim().toLowerCase())
      ) {
        return false;
      }

      // Date requirement
      const itemDate = getItemDate(item);
      if (!itemDate) return false;

      // Time horizon filter
      if (timeHorizonFilter === "upcoming") {
        return itemDate >= today;
      }
      if (timeHorizonFilter === "next_30") {
        return itemDate >= today && itemDate <= plus30Days;
      }
      if (timeHorizonFilter === "next_90") {
        return itemDate >= today && itemDate <= plus90Days;
      }
      if (timeHorizonFilter === "past") {
        return itemDate < today;
      }
      if (timeHorizonFilter === "all") {
        return itemDate >= today;
      }

      return true;
    });

    // Group items by date string
    const map = new Map<string, MergedMediaItem[]>();
    for (const item of validItems) {
      const d = getItemDate(item)!;
      const list = map.get(d) ?? [];
      list.push(item);
      map.set(d, list);
    }

    // Sort the date keys
    const sortedDates = Array.from(map.keys()).sort((a, b) => {
      return sortOrder === "asc" ? a.localeCompare(b) : b.localeCompare(a);
    });

    return sortedDates.map((dateKey) => {
      const dateItems = map.get(dateKey) ?? [];
      // Sort items within each date group alphabetically by title
      dateItems.sort((a, b) => a.title.localeCompare(b.title));

      const { full, relative } = formatDateBanner(dateKey);

      return {
        dateKey,
        formattedDate: full,
        relativeLabel: relative,
        items: dateItems,
      };
    });
  }, [
    items,
    queueFilter,
    mediaTypeFilter,
    localTitleFilter,
    timeHorizonFilter,
    sortOrder,
  ]);

  // Total count of upcoming items across all date groups
  const totalItemsCount = useMemo(() => {
    return dateGroups.reduce((acc, g) => acc + g.items.length, 0);
  }, [dateGroups]);

  // Lazy loading observer: as sentinel enters viewport, reveal more date groups
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleDateLimit((prev) => Math.min(prev + 4, dateGroups.length));
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [dateGroups.length]);

  const visibleGroups = dateGroups.slice(0, visibleDateLimit);

  return (
    <div className="flex flex-col lg:flex-row gap-5 sm:gap-6 items-start w-full">
      {/* =====================================================================
          LEFT (20%) FRAME: High-Pop Minimalist Upcoming Releases Filter Console
          ===================================================================== */}
      <FilterSidebar>
        {/* Frame Header with View Title & Count */}
        <FilterSidebarHeader
          title="UPCOMING RADAR"
          count={totalItemsCount}
        />

        {/* 1. Filter by Title */}
        <div>
          <FilterSearchInput
            id="calendar-title-filter"
            value={localTitleFilter}
            onChange={(e) => setLocalTitleFilter(e.target.value)}
            placeholder="FILTER TITLE..."
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

        {/* 3. Tracked Queue Chip Toggle */}
        <FilterSection label="TRACKED QUEUE">
          <div className="grid grid-cols-3 p-1 bg-[#F4F3F0] rounded-xl gap-1 text-xs sm:text-sm font-mono uppercase text-center">
            <button
              type="button"
              onClick={() => setQueueFilter("all")}
              className={`py-2.5 transition-all cursor-pointer text-center rounded-lg ${
                queueFilter === "all"
                  ? "bg-zinc-800 hover:bg-zinc-700 text-white font-bold shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/80 font-medium"
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => setQueueFilter("watching")}
              className={`py-2.5 transition-all cursor-pointer text-center rounded-lg ${
                queueFilter === "watching"
                  ? "bg-[#818CF8] text-indigo-950 font-black shadow-md ring-2 ring-indigo-500/30"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/80 font-medium"
              }`}
            >
              WATCHING
            </button>
            <button
              type="button"
              onClick={() => setQueueFilter("want_to_watch")}
              className={`py-2.5 transition-all cursor-pointer text-center rounded-lg ${
                queueFilter === "want_to_watch"
                  ? "bg-[#FF7A50] text-zinc-950 font-black shadow-md ring-2 ring-orange-500/30"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/80 font-medium"
              }`}
            >
              WANT
            </button>
          </div>
        </FilterSection>

        {/* 4. Time Horizon Filter */}
        <FilterSection label="TIME HORIZON">
          <div className="grid grid-cols-2 gap-1.5 text-xs sm:text-sm font-mono uppercase">
            {TIME_HORIZONS.map((h) => {
              const isActive = timeHorizonFilter === h.key;
              return (
                <button
                  key={h.key}
                  type="button"
                  onClick={() => setTimeHorizonFilter(h.key)}
                  className={`py-2 px-1 rounded-xl transition-all cursor-pointer text-center truncate font-bold ${
                    isActive
                      ? "bg-zinc-800 hover:bg-zinc-700 text-white shadow-sm"
                      : "bg-[#F4F3F0] text-zinc-600 hover:bg-zinc-200 font-medium"
                  }`}
                >
                  {h.label}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* 5. Sort Order */}
        <FilterSection label="SORT ORDER">
          <SegmentedControl
            value={sortOrder}
            onChange={setSortOrder}
            options={[
              { value: "asc", label: "ASC ↑ (SOONEST)" },
              { value: "desc", label: "DESC ↓ (LATEST)" },
            ]}
          />
        </FilterSection>
      </FilterSidebar>

      {/* =========================================================================
          RIGHT (80%) FRAME: Chronological Timeline of Release Groups
          ========================================================================= */}
      <div className="flex-1 min-w-0 w-full space-y-6">
        {dateGroups.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 sm:p-12 text-center space-y-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5">
            <div className="font-mono text-xs text-zinc-700 uppercase font-bold tracking-widest">
              [ NO UPCOMING RELEASES FOUND ]
            </div>
            <p className="text-xs sm:text-sm font-sans text-zinc-700 max-w-md mx-auto leading-relaxed font-medium">
              No tracked items in your Want-to-Watch or Watching queues match
              the current filters with confirmed release dates.
            </p>
          </section>
        ) : (
          <div className="space-y-6">
            {visibleGroups.map((group) => (
              <section
                key={group.dateKey}
                className="rounded-2xl bg-white/80 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.03)] ring-1 ring-black/5"
              >
                {/* Date Banner */}
                <header className="bg-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] shadow-sm shadow-emerald-500/50 shrink-0" />
                    <h2 className="text-xs sm:text-sm md:text-base font-sans font-black uppercase tracking-wider text-zinc-950">
                      {group.formattedDate}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {group.relativeLabel && (
                      <span className="bg-zinc-950 text-white text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-lg shadow-sm">
                        {group.relativeLabel}
                      </span>
                    )}
                    <span className="bg-zinc-200 text-zinc-950 text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-lg">
                      {group.items.length}{" "}
                      {group.items.length === 1 ? "RELEASE" : "RELEASES"}
                    </span>
                  </div>
                </header>

                {/* Media Cards Grid for this specific date */}
                <div className="p-3 sm:p-4">
                  <div className={MEDIA_GRID_CLASS}>
                    {group.items.map((item) => (
                      <MediaCard
                        key={item.tmdb_id}
                        media={item}
                        onStateChange={handleCardStateChange}
                      />
                    ))}
                  </div>
                </div>
              </section>
            ))}

            {/* Sentinel Element for Lazy Load / Infinite Scroll */}
            <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />

            {/* Manual Load More Button as Fallback */}
            {visibleDateLimit < dateGroups.length && (
              <div className="pt-2 pb-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleDateLimit((prev) => prev + 4)}
                  className="rounded-xl bg-white px-6 py-3 text-xs sm:text-sm font-mono font-bold uppercase text-zinc-950 hover:bg-[#F4F3F0] transition-all cursor-pointer shadow-md ring-1 ring-black/5 active:scale-95"
                >
                  LOAD MORE UPCOMING DATES ({dateGroups.length - visibleDateLimit}{" "}
                  REMAINING) ➔
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
