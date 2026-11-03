"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MediaCard from "@/components/MediaCard";
import ReleaseCalendar from "@/components/ReleaseCalendar";
import { MediaStatus, MediaType, MergedMediaItem } from "@/lib/types";

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
  const [localTitleFilter, setLocalTitleFilter] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | MediaType>(
    "all"
  );
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"updated_at" | "title" | "rating">(
    "updated_at"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

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

  const countByStatus = {
    want_to_watch: items.filter((i) => i.status === "want_to_watch").length,
    watching: items.filter((i) => i.status === "watching").length,
    watched: items.filter((i) => i.status === "watched").length,
  };

  return (
    <div className="space-y-6">
      {/* Top Status View Header */}
      <section className="border-2 border-black bg-white p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b-2 border-black pb-3">
          <div>
            <span className="text-xs uppercase font-bold text-neutral-600 block">
              MEDIA TRACKER
            </span>
            <h1 className="text-xl font-bold uppercase">
              {VIEW_LABELS[activeView]} ({filteredAndSortedItems.length})
            </h1>
          </div>

          {/* Quick View Tabs */}
          <div className="flex flex-wrap border-2 border-black divide-x-2 divide-black text-xs font-bold uppercase">
            <Link
              href="/?view=want_to_watch"
              className={`px-3 py-1.5 ${
                activeView === "want_to_watch"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-neutral-200"
              }`}
            >
              WANT ({countByStatus.want_to_watch})
            </Link>
            <Link
              href="/?view=watching"
              className={`px-3 py-1.5 ${
                activeView === "watching"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-neutral-200"
              }`}
            >
              WATCHING ({countByStatus.watching})
            </Link>
            <Link
              href="/?view=watched"
              className={`px-3 py-1.5 ${
                activeView === "watched"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-neutral-200"
              }`}
            >
              WATCHED ({countByStatus.watched})
            </Link>
            <Link
              href="/?view=calendar"
              className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200"
            >
              CALENDAR RADAR
            </Link>
          </div>
        </div>

        {/* Local Vertical Sorting & Filtering Inputs */}
        <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs uppercase">
          {/* 1. Local Title Filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="local-title-filter" className="font-bold">
              FILTER BY TITLE:
            </label>
            <input
              id="local-title-filter"
              type="text"
              value={localTitleFilter}
              onChange={(e) => setLocalTitleFilter(e.target.value)}
              placeholder="TYPE TITLE..."
              className="border-2 border-black px-2.5 py-1.5 bg-white text-black text-xs focus:outline-none"
            />
          </div>

          {/* 2. Filter by Media Type */}
          <div className="flex flex-col gap-1">
            <label htmlFor="media-type-filter" className="font-bold">
              MEDIA TYPE:
            </label>
            <select
              id="media-type-filter"
              value={mediaTypeFilter}
              onChange={(e) =>
                setMediaTypeFilter(e.target.value as "all" | MediaType)
              }
              className="border-2 border-black px-2.5 py-1.5 bg-white text-black text-xs font-bold uppercase"
            >
              <option value="all">ALL TYPES (MOVIE + TV)</option>
              <option value="movie">MOVIE ONLY</option>
              <option value="tv">TV SERIES ONLY</option>
            </select>
          </div>

          {/* 3. Filter by Minimum Rating */}
          <div className="flex flex-col gap-1">
            <label htmlFor="min-rating-filter" className="font-bold">
              MINIMUM RATING:
            </label>
            <select
              id="min-rating-filter"
              value={minRatingFilter}
              onChange={(e) => setMinRatingFilter(Number(e.target.value))}
              className="border-2 border-black px-2.5 py-1.5 bg-white text-black text-xs font-bold uppercase"
            >
              <option value={0}>ALL RATINGS</option>
              <option value={7}>7+ / 10</option>
              <option value={8}>8+ / 10</option>
              <option value={9}>9+ / 10</option>
            </select>
          </div>

          {/* 4. Sort Field */}
          <div className="flex flex-col gap-1">
            <label htmlFor="sort-by-select" className="font-bold">
              SORT BY FIELD:
            </label>
            <select
              id="sort-by-select"
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "updated_at" | "title" | "rating"
                )
              }
              className="border-2 border-black px-2.5 py-1.5 bg-white text-black text-xs font-bold uppercase"
            >
              <option value="updated_at">UPDATED DATE (updated_at)</option>
              <option value="title">ALPHABETICAL (title)</option>
              <option value="rating">USER RATING (1-10)</option>
            </select>
          </div>

          {/* 5. Sort Direction */}
          <div className="flex flex-col gap-1">
            <span className="font-bold">SORT DIRECTION:</span>
            <div className="grid grid-cols-2 border-2 border-black divide-x-2 divide-black">
              <button
                type="button"
                onClick={() => setSortOrder("desc")}
                className={`py-1.5 font-bold uppercase cursor-pointer ${
                  sortOrder === "desc"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-200"
                }`}
              >
                DESC ↓
              </button>
              <button
                type="button"
                onClick={() => setSortOrder("asc")}
                className={`py-1.5 font-bold uppercase cursor-pointer ${
                  sortOrder === "asc"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-200"
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
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

