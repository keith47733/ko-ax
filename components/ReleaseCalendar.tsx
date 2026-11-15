"use client";

import {
  FilterSearchInput,
  FilterSection,
  FilterSidebar,
  FilterSidebarHeader,
  SegmentedControl,
} from "@/components/FilterSidebar";
import MediaCard from "@/components/MediaCard";
import { formatDateBanner, getItemDate } from "@/lib/utils";
import {
  DateGroup,
  MEDIA_GRID_CLASS,
  MediaType,
  MergedMediaItem,
  ReleaseCalendarProps,
  TimeHorizon,
} from "@/types";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const [timeHorizonFilter, setTimeHorizonFilter] =
    useState<TimeHorizon>("upcoming");
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
        !item.title
          .toLowerCase()
          .includes(localTitleFilter.trim().toLowerCase())
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
    <div className="flex w-full flex-col items-start gap-5 sm:gap-6 lg:flex-row">
      {/* =====================================================================
          LEFT (20%) FRAME: High-Pop Minimalist Upcoming Releases Filter Console
          ===================================================================== */}
      <FilterSidebar>
        {/* Frame Header with View Title & Count */}
        <FilterSidebarHeader title="UPCOMING RADAR" count={totalItemsCount} />

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
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-canvas p-1 text-center font-mono text-xs uppercase sm:text-sm">
            <button
              type="button"
              onClick={() => setQueueFilter("all")}
              className={`cursor-pointer rounded-lg py-2.5 text-center transition-all ${
                queueFilter === "all"
                  ? "border border-zinc-700 bg-zinc-800 font-bold text-white shadow-sm hover:bg-zinc-700"
                  : "border border-transparent font-medium text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900"
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => setQueueFilter("watching")}
              className={`cursor-pointer rounded-lg py-2.5 text-center transition-all ${
                queueFilter === "watching"
                  ? "border border-indigo-500/50 bg-periwinkle font-black text-indigo-950 shadow-md"
                  : "border border-transparent font-medium text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900"
              }`}
            >
              WATCHING
            </button>
            <button
              type="button"
              onClick={() => setQueueFilter("want_to_watch")}
              className={`cursor-pointer rounded-lg py-2.5 text-center transition-all ${
                queueFilter === "want_to_watch"
                  ? "border border-orange-500/50 bg-coral font-black text-zinc-950 shadow-md"
                  : "border border-transparent font-medium text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900"
              }`}
            >
              WANT
            </button>
          </div>
        </FilterSection>

        {/* 4. Time Horizon Filter */}
        <FilterSection label="TIME HORIZON">
          <div className="grid grid-cols-2 gap-1.5 font-mono text-xs uppercase sm:text-sm">
            {TIME_HORIZONS.map((h) => {
              const isActive = timeHorizonFilter === h.key;
              return (
                <button
                  key={h.key}
                  type="button"
                  onClick={() => setTimeHorizonFilter(h.key)}
                  className={`cursor-pointer truncate rounded-xl px-1 py-2 text-center font-bold transition-all ${
                    isActive
                      ? "bg-zinc-800 text-white shadow-sm hover:bg-zinc-700"
                      : "bg-canvas font-medium text-zinc-600 hover:bg-zinc-200"
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
      <div className="w-full min-w-0 flex-1 space-y-6">
        {dateGroups.length === 0 ? (
          <section className="space-y-3 rounded-2xl bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 sm:p-12">
            <div className="font-mono text-xs font-bold tracking-widest text-zinc-700 uppercase">
              [ NO UPCOMING RELEASES FOUND ]
            </div>
            <p className="mx-auto max-w-md font-sans text-xs leading-relaxed font-medium text-zinc-700 sm:text-sm">
              No tracked items in your Want-to-Watch or Watching queues match
              the current filters with confirmed release dates.
            </p>
          </section>
        ) : (
          <div className="space-y-6">
            {visibleGroups.map((group) => (
              <section
                key={group.dateKey}
                className="overflow-hidden rounded-2xl bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] ring-1 ring-black/5"
              >
                {/* Date Banner */}
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-mint h-2.5 w-2.5 shrink-0 rounded-full shadow-sm shadow-emerald-500/50" />
                    <h2 className="font-sans text-xs font-black tracking-wider text-zinc-950 uppercase sm:text-sm md:text-base">
                      {group.formattedDate}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {group.relativeLabel && (
                      <span className="rounded-lg bg-zinc-950 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white uppercase shadow-sm">
                        {group.relativeLabel}
                      </span>
                    )}
                    <span className="rounded-lg bg-zinc-200 px-2.5 py-0.5 font-mono text-[11px] font-bold text-zinc-950 uppercase">
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
              <div className="flex justify-center pt-2 pb-6">
                <button
                  type="button"
                  onClick={() => setVisibleDateLimit((prev) => prev + 4)}
                  className="cursor-pointer rounded-xl border border-zinc-300 bg-white px-6 py-3 font-mono text-xs font-bold text-zinc-950 uppercase shadow-md transition-all hover:bg-canvas active:scale-95 sm:text-sm"
                >
                  LOAD MORE UPCOMING DATES (
                  {dateGroups.length - visibleDateLimit} REMAINING) ➔
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
