"use client";

import React, { useMemo, useState } from "react";
import MediaCard from "@/components/MediaCard";
import { MediaType, MergedMediaItem } from "@/lib/types";

interface ReleaseCalendarProps {
  initialItems: MergedMediaItem[];
  dataSource?: "supabase" | "wireframe-store";
}

export default function ReleaseCalendar({
  initialItems,
  dataSource = "wireframe-store",
}: ReleaseCalendarProps) {
  const [items, setItems] = useState<MergedMediaItem[]>(initialItems);
  const [layoutMode, setLayoutMode] = useState<"grid" | "agenda">("grid");
  const [mediaFilter, setMediaFilter] = useState<"all" | MediaType>("all");

  function handleCardStateChange(updated: MergedMediaItem) {
    setItems((prev) =>
      prev.map((item) =>
        item.tmdb_id === updated.tmdb_id ? { ...item, ...updated } : item
      )
    );
  }

  const watchingReleases = useMemo(() => {
    return items
      .filter(
        (item) =>
          item.status === "watching" &&
          (mediaFilter === "all" || item.media_type === mediaFilter)
      )
      .sort((a, b) =>
        (a.next_air_date || a.release_date || "9999-12-31").localeCompare(
          b.next_air_date || b.release_date || "9999-12-31"
        )
      );
  }, [items, mediaFilter]);

  const wantToWatchReleases = useMemo(() => {
    return items
      .filter(
        (item) =>
          item.status === "want_to_watch" &&
          (mediaFilter === "all" || item.media_type === mediaFilter)
      )
      .sort((a, b) =>
        (a.next_air_date || a.release_date || "9999-12-31").localeCompare(
          b.next_air_date || b.release_date || "9999-12-31"
        )
      );
  }, [items, mediaFilter]);

  return (
    <div className="space-y-8">
      {/* Top Release Radar Wireframe Header & Local Controls */}
      <section className="border-2 border-black bg-white p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b-2 border-black pb-3">
          <div>
            <div className="text-xs uppercase font-bold text-neutral-600">
              RELEASE RADAR
            </div>
            <h1 className="text-xl font-bold uppercase mt-0.5">
              RELEASE CALENDAR
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Media Type Filter */}
            <div className="flex border-2 border-black divide-x-2 divide-black text-xs font-bold uppercase">
              {(["all", "tv", "movie"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMediaFilter(type)}
                  className={`px-3 py-1.5 uppercase cursor-pointer ${
                    mediaFilter === type
                      ? "bg-black text-white"
                      : "bg-white text-black hover:bg-neutral-200"
                  }`}
                >
                  {type === "all" ? "ALL MEDIA" : type.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Layout Mode Toggle (Grid vs Agenda) */}
            <div className="flex border-2 border-black divide-x-2 divide-black text-xs font-bold uppercase">
              <button
                type="button"
                onClick={() => setLayoutMode("grid")}
                className={`px-3 py-1.5 cursor-pointer ${
                  layoutMode === "grid"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-200"
                }`}
              >
                GRID VIEW
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("agenda")}
                className={`px-3 py-1.5 cursor-pointer ${
                  layoutMode === "agenda"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-200"
                }`}
              >
                AGENDA VIEW
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-xs uppercase">
          <div className="border-2 border-black p-2 bg-neutral-100 flex justify-between items-center">
            <span className="font-bold">
              WATCHING (NEW EPISODES):
            </span>
            <span className="border-2 border-black bg-white px-2 py-0.5 font-bold">
              {watchingReleases.length} ACTIVE
            </span>
          </div>
          <div className="border-2 border-black p-2 bg-neutral-100 flex justify-between items-center">
            <span className="font-bold">
              WANT TO WATCH (UPCOMING RELEASES):
            </span>
            <span className="border-2 border-black bg-white px-2 py-0.5 font-bold">
              {wantToWatchReleases.length} QUEUED
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 1: CURRENTLY WATCHING (E.g. New TV Episodes Dropping This Week)
         ===================================================================== */}
      <section className="border-2 border-black bg-white">
        <header className="border-b-2 border-black bg-black text-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <span className="text-[11px] uppercase tracking-wider block text-neutral-300">
              CURRENTLY WATCHING
            </span>
            <h2 className="text-base font-bold uppercase">
              UPCOMING EPISODES DROPPING SOON
            </h2>
          </div>
          <span className="border border-white px-2 py-0.5 text-xs font-bold uppercase self-start sm:self-auto">
            {watchingReleases.length} ITEMS
          </span>
        </header>

        <div className="p-4">
          {watchingReleases.length === 0 ? (
            <div className="border-2 border-black p-8 text-center text-xs uppercase bg-neutral-100">
              NO UPCOMING RELEASES IN YOUR &apos;WATCHING&apos; LIST.
            </div>
          ) : layoutMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {watchingReleases.map((item) => (
                <MediaCard
                  key={item.tmdb_id}
                  media={item}
                  showReleaseBanner={true}
                  onStateChange={handleCardStateChange}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {watchingReleases.map((item) => (
                <div
                  key={item.tmdb_id}
                  className="border-2 border-black bg-neutral-100 p-3 grid grid-cols-1 md:grid-cols-12 gap-4 items-start"
                >
                  <div className="md:col-span-4 border-2 border-black bg-white p-3 space-y-1 text-xs uppercase">
                    <div className="font-bold text-sm border-b-2 border-black pb-1">
                      DROP DATE: {item.next_air_date || item.release_date || "TBA"}
                    </div>
                    <div className="font-bold">
                      QUEUE: CURRENTLY WATCHING
                    </div>
                    <div className="text-neutral-700">
                      EVENT: {item.next_episode_label || "NEXT EPISODE"}
                    </div>
                  </div>
                  <div className="md:col-span-8 max-w-md">
                    <MediaCard
                      media={item}
                      showReleaseBanner={true}
                      onStateChange={handleCardStateChange}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: WANT TO WATCH (E.g. Upcoming Theatrical Movie Releases)
         ===================================================================== */}
      <section className="border-2 border-black bg-white">
        <header className="border-b-2 border-black bg-neutral-200 text-black px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <span className="text-[11px] uppercase tracking-wider block text-neutral-600">
              WANT TO WATCH
            </span>
            <h2 className="text-base font-bold uppercase">
              UPCOMING PREMIERES &amp; RELEASES
            </h2>
          </div>
          <span className="border-2 border-black bg-white px-2 py-0.5 text-xs font-bold uppercase self-start sm:self-auto">
            {wantToWatchReleases.length} ITEMS
          </span>
        </header>

        <div className="p-4">
          {wantToWatchReleases.length === 0 ? (
            <div className="border-2 border-black p-8 text-center text-xs uppercase bg-neutral-100">
              NO UPCOMING RELEASES IN YOUR &apos;WANT TO WATCH&apos; LIST.
            </div>
          ) : layoutMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {wantToWatchReleases.map((item) => (
                <MediaCard
                  key={item.tmdb_id}
                  media={item}
                  showReleaseBanner={true}
                  onStateChange={handleCardStateChange}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {wantToWatchReleases.map((item) => (
                <div
                  key={item.tmdb_id}
                  className="border-2 border-black bg-neutral-100 p-3 grid grid-cols-1 md:grid-cols-12 gap-4 items-start"
                >
                  <div className="md:col-span-4 border-2 border-black bg-white p-3 space-y-1 text-xs uppercase">
                    <div className="font-bold text-sm border-b-2 border-black pb-1">
                      RELEASE DATE:{" "}
                      {item.next_air_date || item.release_date || "TBA"}
                    </div>
                    <div className="font-bold">QUEUE: WANT TO WATCH</div>
                    <div className="text-neutral-700">
                      FORMAT: {item.media_type.toUpperCase()} PREMIERE
                    </div>
                  </div>
                  <div className="md:col-span-8 max-w-md">
                    <MediaCard
                      media={item}
                      showReleaseBanner={true}
                      onStateChange={handleCardStateChange}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

