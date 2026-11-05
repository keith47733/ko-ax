"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import MediaCard from "@/components/MediaCard";
import { MEDIA_GRID_CLASS, MediaType, MergedMediaItem } from "@/lib/types";

interface ReleaseCalendarProps {
  initialItems: MergedMediaItem[];
  dataSource?: "supabase" | "wireframe-store";
}

interface DateGroup {
  dateKey: string;
  formattedDate: string;
  relativeLabel: string;
  items: MergedMediaItem[];
}

function getItemDate(item: MergedMediaItem): string | null {
  return item.next_air_date || item.release_date || null;
}

function formatDateBanner(dateStr: string): { full: string; relative: string } {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day, 12, 0, 0);

    const full = dateObj
      .toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      .toUpperCase();

    // Calculate relative distance
    const today = new Date();
    const todayNoon = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      12,
      0,
      0,
    );
    const diffDays = Math.round(
      (dateObj.getTime() - todayNoon.getTime()) / (1000 * 60 * 60 * 24),
    );

    let relative = "";
    if (diffDays === 0) {
      relative = "TODAY";
    } else if (diffDays === 1) {
      relative = "TOMORROW";
    } else if (diffDays === -1) {
      relative = "YESTERDAY";
    } else if (diffDays > 1 && diffDays <= 6) {
      const weekday = dateObj
        .toLocaleDateString("en-US", { weekday: "long" })
        .toUpperCase();
      relative = `THIS ${weekday}`;
    } else if (diffDays > 6 && diffDays <= 13) {
      const weekday = dateObj
        .toLocaleDateString("en-US", { weekday: "long" })
        .toUpperCase();
      relative = `NEXT ${weekday}`;
    } else if (diffDays > 13) {
      relative = `IN ${diffDays} DAYS`;
    } else {
      relative = `${Math.abs(diffDays)} DAYS AGO`;
    }

    return { full, relative };
  } catch {
    return { full: dateStr.toUpperCase(), relative: "" };
  }
}

type TimeHorizon = "upcoming" | "next_30" | "next_90" | "all" | "past";

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
  const [timeHorizonFilter, setTimeHorizonFilter] = useState<
    "upcoming" | "next_30" | "next_90" | "all" | "past"
  >("upcoming");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Progressive reveal / Lazy load pagination for date groups
  const [visibleDateLimit, setVisibleDateLimit] = useState(4);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  function handleCardStateChange(updated: MergedMediaItem) {
    setItems((prev) =>
      prev.map((item) =>
        item.tmdb_id === updated.tmdb_id ? { ...item, ...updated } : item,
      ),
    );
  }

  // Filter and group items into chronological date groups
  const dateGroups: DateGroup[] = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // 30 and 90 day thresholds
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    const in30Str = in30Days.toISOString().split("T")[0];

    const in90Days = new Date(today);
    in90Days.setDate(in90Days.getDate() + 90);
    const in90Str = in90Days.toISOString().split("T")[0];

    // Filter relevant items (only items in WANT or WATCHING that have a valid date)
    const eligibleItems = items.filter((item) => {
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
      if (localTitleFilter.trim()) {
        const match = item.title
          .toLowerCase()
          .includes(localTitleFilter.toLowerCase().trim());
        if (!match) return false;
      }

      // Date requirement
      const itemDate = getItemDate(item);
      if (!itemDate) return false;

      // Time horizon filter
      if (timeHorizonFilter === "upcoming" && itemDate < todayStr) {
        return false;
      }
      if (
        timeHorizonFilter === "next_30" &&
        (itemDate < todayStr || itemDate > in30Str)
      ) {
        return false;
      }
      if (
        timeHorizonFilter === "next_90" &&
        (itemDate < todayStr || itemDate > in90Str)
      ) {
        return false;
      }
      if (timeHorizonFilter === "past" && itemDate >= todayStr) {
        return false;
      }

      return true;
    });

    // Group items by date string
    const groupedMap = new Map<string, MergedMediaItem[]>();
    for (const item of eligibleItems) {
      const d = getItemDate(item)!;
      const list = groupedMap.get(d) || [];
      list.push(item);
      groupedMap.set(d, list);
    }

    // Sort the date keys
    const sortedDates = Array.from(groupedMap.keys()).sort((a, b) => {
      return sortOrder === "asc" ? a.localeCompare(b) : b.localeCompare(a);
    });

    return sortedDates.map((dateKey) => {
      const { full, relative } = formatDateBanner(dateKey);
      return {
        dateKey,
        formattedDate: full,
        relativeLabel: relative,
        items: groupedMap.get(dateKey) || [],
      };
    });
  }, [
    items,
    localTitleFilter,
    mediaTypeFilter,
    queueFilter,
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
          setVisibleDateLimit((prev) => prev + 3);
        }
      },
      { rootMargin: "250px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [dateGroups.length]);

  const visibleGroups = dateGroups.slice(0, visibleDateLimit);

  return (
    <div className="flex flex-col lg:flex-row gap-5 sm:gap-6 items-start w-full">
      {/* =====================================================================
          LEFT (20%) FRAME: Archival Upcoming Releases Filter Console
          ===================================================================== */}
      <aside className="w-full lg:w-72 shrink-0 border border-stone-300 rounded-md bg-stone-50 p-4 shadow-sm space-y-4">
        {/* Frame Header with View Title & Count */}
        <div className="border-b border-stone-200 pb-3 flex items-center justify-between gap-2">
          <h2 className="font-serif text-sm sm:text-base font-bold text-stone-900 tracking-tight truncate">
            UPCOMING RADAR
          </h2>
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded border border-stone-300 shrink-0 bg-stone-200 text-stone-700">
            [{totalItemsCount}]
          </span>
        </div>

        {/* 1. Filter by Title */}
        <div>
          <input
            id="calendar-title-filter"
            type="text"
            value={localTitleFilter}
            onChange={(e) => setLocalTitleFilter(e.target.value)}
            placeholder="FILTER TITLE..."
            className="w-full h-9 border border-stone-300 rounded-md px-2.5 bg-stone-50 text-stone-900 text-xs sm:text-sm font-sans focus:outline-none focus:border-stone-500 placeholder:text-stone-400"
          />
        </div>

        {/* 2. Media Type Chip Toggle */}
        <div className="space-y-1">
          <span className="block text-[10px] font-mono font-medium uppercase text-stone-500 tracking-wider">
            MEDIA TYPE
          </span>
          <div className="grid grid-cols-3 border border-stone-300 divide-x divide-stone-300 rounded-md overflow-hidden text-xs sm:text-sm font-mono uppercase text-center bg-stone-50 shadow-sm">
            <button
              type="button"
              onClick={() => setMediaTypeFilter("all")}
              className={`py-2 transition-colors cursor-pointer text-center ${
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
              className={`py-2 transition-colors cursor-pointer text-center ${
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
              className={`py-2 transition-colors cursor-pointer text-center ${
                mediaTypeFilter === "tv"
                  ? "bg-stone-800 text-white font-medium"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              TV
            </button>
          </div>
        </div>

        {/* 3. Tracked Queue Chip Toggle */}
        <div className="space-y-1">
          <span className="block text-[10px] font-mono font-medium uppercase text-stone-500 tracking-wider">
            TRACKED QUEUE
          </span>
          <div className="grid grid-cols-3 border border-stone-300 divide-x divide-stone-300 rounded-md overflow-hidden text-xs sm:text-sm font-mono uppercase text-center bg-stone-50 shadow-sm">
            <button
              type="button"
              onClick={() => setQueueFilter("all")}
              className={`py-2 transition-colors cursor-pointer text-center ${
                queueFilter === "all"
                  ? "bg-stone-800 text-white font-medium"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => setQueueFilter("watching")}
              className={`py-2 transition-colors cursor-pointer text-center ${
                queueFilter === "watching"
                  ? "bg-stone-800 text-white font-medium"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              WATCHING
            </button>
            <button
              type="button"
              onClick={() => setQueueFilter("want_to_watch")}
              className={`py-2 transition-colors cursor-pointer text-center ${
                queueFilter === "want_to_watch"
                  ? "bg-orange-700 text-white font-medium"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              WANT
            </button>
          </div>
        </div>

        {/* 4. Time Horizon Filter */}
        <div className="space-y-1">
          <span className="block text-[10px] font-mono font-medium uppercase text-stone-500 tracking-wider">
            TIME HORIZON
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-xs font-mono uppercase">
            {TIME_HORIZONS.map((h) => {
              const isActive = timeHorizonFilter === h.key;
              return (
                <button
                  key={h.key}
                  type="button"
                  onClick={() => setTimeHorizonFilter(h.key)}
                  className={`py-2 px-1 border rounded-md transition-colors cursor-pointer text-center truncate ${
                    isActive
                      ? "bg-stone-800 text-white border-stone-800 font-medium shadow-sm"
                      : "bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-300"
                  }`}
                >
                  {h.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Sort Order */}
        <div className="space-y-1">
          <span className="block text-[10px] font-mono font-medium uppercase text-stone-500 tracking-wider">
            SORT ORDER
          </span>
          <div className="grid grid-cols-2 border border-stone-300 divide-x divide-stone-300 rounded-md overflow-hidden text-xs sm:text-sm font-mono uppercase text-center bg-stone-50 shadow-sm">
            <button
              type="button"
              onClick={() => setSortOrder("asc")}
              className={`py-2 transition-colors cursor-pointer text-center ${
                sortOrder === "asc"
                  ? "bg-stone-800 text-white font-medium"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              ASC ↑ (SOONEST)
            </button>
            <button
              type="button"
              onClick={() => setSortOrder("desc")}
              className={`py-2 transition-colors cursor-pointer text-center ${
                sortOrder === "desc"
                  ? "bg-stone-800 text-white font-medium"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              DESC ↓ (LATEST)
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          RIGHT (80%) FRAME: Chronological Timeline of Release Groups
          ========================================================================= */}
      <div className="flex-1 min-w-0 w-full space-y-6">
        {dateGroups.length === 0 ? (
          <section className="border border-stone-300 rounded-md bg-stone-50 p-8 sm:p-12 text-center space-y-3 shadow-sm">
            <div className="font-mono text-xs text-stone-500 uppercase font-medium tracking-widest">
              [ NO UPCOMING RELEASES FOUND ]
            </div>
            <p className="text-xs sm:text-sm font-sans text-stone-600 max-w-md mx-auto leading-relaxed">
              No tracked items in your Want-to-Watch or Watching queues match
              the current filters with confirmed release dates.
            </p>
          </section>
        ) : (
          <div className="space-y-6">
            {visibleGroups.map((group) => (
              <section
                key={group.dateKey}
                className="border border-stone-300 rounded-md bg-stone-50 overflow-hidden shadow-sm"
              >
                {/* Date Banner */}
                <header className="border-b border-stone-200 bg-stone-100/70 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-stone-600 shrink-0" />
                    <h2 className="text-xs sm:text-sm font-serif font-bold uppercase tracking-wider text-stone-900">
                      {group.formattedDate}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {group.relativeLabel && (
                      <span className="bg-stone-800 text-white text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded">
                        {group.relativeLabel}
                      </span>
                    )}
                    <span className="border border-stone-300 bg-stone-200 text-stone-700 text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded">
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
                  className="border border-stone-300 rounded-md bg-stone-50 px-6 py-2.5 text-xs font-mono font-medium uppercase text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer shadow-sm"
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
