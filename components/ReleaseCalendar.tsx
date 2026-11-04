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
      0
    );
    const diffDays = Math.round(
      (dateObj.getTime() - todayNoon.getTime()) / (1000 * 60 * 60 * 24)
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
    "all"
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
        item.tmdb_id === updated.tmdb_id ? { ...item, ...updated } : item
      )
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
      { rootMargin: "250px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [dateGroups.length]);

  const visibleGroups = dateGroups.slice(0, visibleDateLimit);

  return (
    <div className="space-y-6">
      {/* =========================================================================
          TOP HERO COMMAND BAR (1-Tap Chip Toggles)
          ========================================================================= */}
      <section className="border-2 border-black bg-white p-3 sm:p-4 rounded-[2px]">
        <div>
          <span className="text-[10px] sm:text-xs uppercase font-bold text-neutral-600 block">
            RELEASE RADAR
          </span>
          <h1 className="text-lg sm:text-xl font-bold uppercase">
            RELEASE CALENDAR ({totalItemsCount} UPCOMING)
          </h1>
        </div>

        {/* 1-Tap Chip Toggles Bar */}
        <div className="pt-2.5 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs uppercase">
          {/* 1. Filter by Title */}
          <div className="w-full sm:w-48 md:w-56 shrink-0">
            <input
              id="calendar-title-filter"
              type="text"
              value={localTitleFilter}
              onChange={(e) => setLocalTitleFilter(e.target.value)}
              placeholder="FILTER TITLE..."
              className="w-full h-8 sm:h-8.5 border-2 border-black px-2.5 bg-white text-black text-xs font-bold uppercase rounded-[2px] focus:outline-none placeholder:text-neutral-400 placeholder:font-normal"
            />
          </div>

          {/* 2. Media Type Chip Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[10px] text-neutral-500 shrink-0">
              MEDIA:
            </span>
            <div className="inline-flex border-2 border-black divide-x-2 divide-black rounded-[2px] overflow-hidden text-[10px] sm:text-[11px] font-bold uppercase">
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

          {/* 3. Queue Status Chip Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[10px] text-neutral-500 shrink-0">
              QUEUE:
            </span>
            <div className="inline-flex border-2 border-black divide-x-2 divide-black rounded-[2px] overflow-hidden text-[10px] sm:text-[11px] font-bold uppercase">
              <button
                type="button"
                onClick={() => setQueueFilter("all")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  queueFilter === "all"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter("watching")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  queueFilter === "watching"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                WATCHING
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter("want_to_watch")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  queueFilter === "want_to_watch"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                WANT
              </button>
            </div>
          </div>

          {/* 4. Time Horizon Chip Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[10px] text-neutral-500 shrink-0">
              HORIZON:
            </span>
            <div className="inline-flex border-2 border-black divide-x-2 divide-black rounded-[2px] overflow-hidden text-[10px] sm:text-[11px] font-bold uppercase">
              <button
                type="button"
                onClick={() => setTimeHorizonFilter("upcoming")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  timeHorizonFilter === "upcoming"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                UPCOMING
              </button>
              <button
                type="button"
                onClick={() => setTimeHorizonFilter("next_30")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  timeHorizonFilter === "next_30"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                30D
              </button>
              <button
                type="button"
                onClick={() => setTimeHorizonFilter("next_90")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  timeHorizonFilter === "next_90"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                90D
              </button>
              <button
                type="button"
                onClick={() => setTimeHorizonFilter("all")}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  timeHorizonFilter === "all"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                ALL
              </button>
            </div>
          </div>

          {/* 5. Sort Direction Toggle (Option B: Dedicated Buttons) */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[10px] text-neutral-500 shrink-0">
              DIR:
            </span>
            <div className="inline-flex border-2 border-black divide-x-2 divide-black rounded-[2px] overflow-hidden text-[10px] sm:text-[11px] font-bold uppercase">
              <button
                type="button"
                onClick={() => setSortOrder("asc")}
                title="Earliest date first"
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  sortOrder === "asc"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                ASC ↑
              </button>
              <button
                type="button"
                onClick={() => setSortOrder("desc")}
                title="Latest date first"
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  sortOrder === "desc"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                DESC ↓
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CHRONOLOGICAL RELEASE STREAM (Grouped by Date, Skipping Empty Days)
          ========================================================================= */}
      {dateGroups.length === 0 ? (
        <section className="border-2 border-black bg-white p-8 text-center text-xs uppercase font-bold">
          NO UPCOMING RELEASES FOUND MATCHING CURRENT CRITERIA.
        </section>
      ) : (
        <div className="space-y-6">
          {visibleGroups.map((group) => (
            <section
              key={group.dateKey}
              className="border-2 border-black bg-white overflow-hidden shadow-xs"
            >
              {/* Date Banner */}
              <header className="border-b-2 border-black bg-neutral-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 bg-black shrink-0" />
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black">
                    {group.formattedDate}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {group.relativeLabel && (
                    <span className="bg-black text-white text-[10px] font-bold uppercase px-2 py-0.5 tracking-wider">
                      {group.relativeLabel}
                    </span>
                  )}
                  <span className="border-2 border-black bg-white text-[10px] font-bold uppercase px-2 py-0.5">
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
                className="border-2 border-black bg-white px-6 py-2.5 text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
              >
                LOAD MORE UPCOMING DATES ({dateGroups.length - visibleDateLimit}{" "}
                REMAINING) ➔
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
