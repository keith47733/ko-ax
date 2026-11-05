"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildDefaultSeasonsForTv,
  clearWireframeStore,
  getMergedSeedItems,
  getWireframeStore,
  isSupabaseConfigured,
} from "@/lib/supabase";
import {
  DISCOVERY_ERAS,
  DISCOVERY_GENRES,
  DiscoveryEngineResult,
  DiscoverySeedInfo,
  MediaStatus,
  MediaType,
  MergedMediaItem,
  SeasonWireframeGroup,
  UserEpisodeRecord,
  UserMediaRecord,
  TmdbRawResult,
  RawTmdbRecommendation,
  DiscoveredFallbackItem,
  TmdbDetailPayload,
} from "@/types";

function getTmdbHeaders(): HeadersInit {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }
  return {
    "Content-Type": "application/json",
  };
}

function buildTmdbUrl(path: string, params: Record<string, string> = {}): string {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  if (!process.env.TMDB_ACCESS_TOKEN && process.env.TMDB_API_KEY) {
    url.searchParams.set("api_key", process.env.TMDB_API_KEY);
  }
  return url.toString();
}

/**
 * Sanitizes TMDB release and air dates so empty strings and invalid formats
 * never violate PostgreSQL DATE type constraints ('invalid input syntax for type date: ""').
 */
function sanitizeDate(val?: string | null): string | null {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  if (isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
}

/**
 * Helper to get the server Supabase client wired with cookies, plus authenticated user info.
 * Supports both live Supabase sessions and simulated operator session fallback.
 */
async function getAuthenticatedUser(): Promise<{
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | null;
  user: { id: string; email?: string } | null;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  let supabaseClient: Awaited<ReturnType<typeof createServerSupabaseClient>> | null = null;

  if (supabaseUrl && supabaseKey) {
    try {
      supabaseClient = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (user) {
        return { supabase: supabaseClient, user: { id: user.id, email: user.email } };
      }
    } catch {
      // Fall through to simulated check
    }
  }

  try {
    const cookieStore = await cookies();
    const simCookie = cookieStore.get("koax_operator_session");
    if (simCookie?.value) {
      const parsed = JSON.parse(simCookie.value);
      if (parsed.email) {
        return {
          supabase: supabaseClient,
          user: { id: "simulated_operator", email: parsed.email },
        };
      }
    }
  } catch {
    // ignore
  }

  return { supabase: supabaseClient, user: null };
}

/**
 * Shared helper: Cross-references a list of TMDB IDs against the user's library
 * in Supabase (if authenticated/configured) or the wireframe store.
 */
async function getUserMediaLookup(tmdbIds: number[]): Promise<{
  lookup: Map<number, UserMediaRecord>;
  usedSupabase: boolean;
}> {
  const lookup = new Map<number, UserMediaRecord>();
  let usedSupabase = false;

  if (tmdbIds.length === 0) {
    return { lookup, usedSupabase };
  }

  const { supabase, user } = await getAuthenticatedUser();
  if (supabase && user) {
    try {
      const { data: userMediaRows, error } = await supabase
        .from("user_media")
        .select("tmdb_id, status, rating, updated_at")
        .eq("user_id", user.id)
        .in("tmdb_id", tmdbIds);

      if (!error && userMediaRows) {
        usedSupabase = true;
        for (const row of userMediaRows) {
          lookup.set(Number(row.tmdb_id), {
            tmdb_id: Number(row.tmdb_id),
            status: row.status as MediaStatus,
            rating: row.rating !== null ? Number(row.rating) : null,
            updated_at: row.updated_at,
          });
        }
      }
    } catch {
      // Supabase lookup error fallback
    }
  }

  // Cross-reference wireframe store when Supabase isn't active or for untracked items
  const store = getWireframeStore();
  for (const id of tmdbIds) {
    if (!lookup.has(id)) {
      const localMatch = store.userMedia.get(id);
      if (localMatch) {
        lookup.set(id, localMatch);
      }
    }
  }

  return { lookup, usedSupabase };
}

/**
 * Deliverable 3 helper:
 * Fetches raw TMDB search results and strictly cross-references their tmdb_id
 * values against the local Supabase `user_media` table.
 */
export async function searchAndMergeMedia(query: string): Promise<{
  items: MergedMediaItem[];
  rawTmdbCount: number;
  matchedDbCount: number;
  dataSource: "supabase" | "wireframe-store";
}> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      items: [],
      rawTmdbCount: 0,
      matchedDbCount: 0,
      dataSource: isSupabaseConfigured ? "supabase" : "wireframe-store",
    };
  }

  let rawMediaResults: Array<{
    tmdb_id: number;
    title: string;
    media_type: MediaType;
    poster_path: string | null;
    backdrop_path?: string | null;
    release_date: string | null;
    overview: string | null;
    tmdb_rating?: number | null;
  }> = [];

  try {
    const url = buildTmdbUrl("/search/multi", {
      query: trimmed,
      include_adult: "false",
      language: "en-US",
      page: "1",
    });

    const response = await fetch(url, {
      headers: getTmdbHeaders(),
      cache: "no-store",
    });

    if (response.ok) {
      const json = (await response.json()) as { results?: TmdbRawResult[] };
      const results = json.results ?? [];

      rawMediaResults = results
        .filter(
          (item): item is TmdbRawResult & { media_type: "movie" | "tv" } =>
            item.media_type === "movie" || item.media_type === "tv"
        )
        .map((item) => ({
          tmdb_id: item.id,
          title: item.title || item.name || `Untitled #${item.id}`,
          media_type: item.media_type,
          poster_path: item.poster_path ?? null,
          backdrop_path: item.backdrop_path ?? null,
          release_date: item.release_date || item.first_air_date || null,
          overview: item.overview ?? null,
          tmdb_rating:
            typeof item.vote_average === "number"
              ? Math.round(item.vote_average * 10) / 10
              : null,
        }));
    }
  } catch {
    // Fallback to local seed matching if network/TMDB is unreachable
  }

  if (rawMediaResults.length === 0) {
    // Fallback against local seed catalog if TMDB returned nothing or is offline
    const store = getWireframeStore();
    for (const m of store.media.values()) {
      if (m.title.toLowerCase().includes(trimmed.toLowerCase())) {
        rawMediaResults.push({
          tmdb_id: m.tmdb_id,
          title: m.title,
          media_type: m.media_type,
          poster_path: m.poster_path,
          release_date: m.release_date ?? null,
          overview: m.overview ?? null,
          tmdb_rating: m.tmdb_rating ?? null,
        });
      }
    }
  }

  const tmdbIds = rawMediaResults.map((r) => r.tmdb_id);
  const store = getWireframeStore();
  const { lookup: userMediaLookup, usedSupabase } =
    await getUserMediaLookup(tmdbIds);

  const mergedItems: MergedMediaItem[] = rawMediaResults.map((raw) => {
    const matched = userMediaLookup.get(raw.tmdb_id);
    return {
      tmdb_id: raw.tmdb_id,
      title: raw.title,
      media_type: raw.media_type,
      poster_path: raw.poster_path,
      backdrop_path: raw.backdrop_path ?? null,
      release_date: raw.release_date,
      overview: raw.overview,
      status: matched?.status ?? null,
      rating: matched?.rating ?? null,
      updated_at: matched?.updated_at ?? null,
      tmdb_rating: raw.tmdb_rating ?? null,
      seasons:
        raw.media_type === "tv"
          ? buildDefaultSeasonsForTv(raw.tmdb_id, store.userEpisodes)
          : undefined,
    };
  });

  return {
    items: mergedItems,
    rawTmdbCount: rawMediaResults.length,
    matchedDbCount: userMediaLookup.size,
    dataSource: usedSupabase ? "supabase" : "wireframe-store",
  };
}

/**
 * Fetches all user-tracked media items merged with cached TMDB metadata.
 */
export async function getTrackedMediaAction(): Promise<{
  items: MergedMediaItem[];
  dataSource: "supabase" | "wireframe-store";
}> {
  const { supabase, user } = await getAuthenticatedUser();
  const store = getWireframeStore();

  if (supabase && user) {
    const { data: rows } = await supabase
      .from("user_media")
      .select(
          `
          tmdb_id,
          status,
          rating,
          updated_at,
          media:tmdb_id (
            tmdb_id,
            title,
            media_type,
            poster_path,
            release_date,
            next_air_date,
            next_episode_label,
            overview
          )
        `
        )
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      const { data: epRows } = await supabase
        .from("user_episodes")
        .select(
          "tmdb_id, tmdb_episode_id, season_number, episode_number, watched_boolean, watch_date"
        )
        .eq("user_id", user.id);

      const episodeMap = new Map<number, UserEpisodeRecord>();
      for (const ep of epRows ?? []) {
        episodeMap.set(Number(ep.tmdb_episode_id), {
          tmdb_id: Number(ep.tmdb_id),
          tmdb_episode_id: Number(ep.tmdb_episode_id),
          season_number: Number(ep.season_number),
          episode_number: Number(ep.episode_number),
          watched_boolean: Boolean(ep.watched_boolean),
          watch_date: ep.watch_date,
        });
      }

      if (rows) {
        const items: MergedMediaItem[] = rows.map((row) => {
          const mediaObj = Array.isArray(row.media) ? row.media[0] : row.media;
          const tmdbId = Number(row.tmdb_id);
          const mediaType = (mediaObj?.media_type as MediaType) || "movie";

          return {
            tmdb_id: tmdbId,
            title: mediaObj?.title || `Media #${tmdbId}`,
            media_type: mediaType,
            poster_path: mediaObj?.poster_path ?? null,
            backdrop_path: store.media.get(tmdbId)?.backdrop_path ?? null,
            release_date: mediaObj?.release_date ?? null,
            next_air_date:
              mediaObj?.next_air_date ?? mediaObj?.release_date ?? null,
            next_episode_label: mediaObj?.next_episode_label ?? null,
            overview:
              mediaObj?.overview ?? store.media.get(tmdbId)?.overview ?? null,
            status: row.status as MediaStatus,
            rating: row.rating !== null ? Number(row.rating) : null,
            updated_at: row.updated_at,
            tmdb_rating: store.media.get(tmdbId)?.tmdb_rating ?? null,
            seasons:
              mediaType === "tv"
                ? buildDefaultSeasonsForTv(tmdbId, episodeMap)
                : undefined,
          };
        });

        return { items, dataSource: "supabase" };
      }
    }

  return {
    items: getMergedSeedItems(),
    dataSource: "wireframe-store",
  };
}

/**
 * Deliverable 4 mutation:
 * Triggered directly from the Unified Media Card component when Status or Rating changes.
 * Upserts into `public.media` (cache) and `public.user_media` (user state).
 */
export async function upsertUserMediaAction(input: {
  tmdb_id: number;
  title: string;
  media_type: MediaType;
  poster_path: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  next_air_date?: string | null;
  next_episode_label?: string | null;
  overview?: string | null;
  status: MediaStatus | null;
  rating: number | null;
}): Promise<{
  ok: boolean;
  status: MediaStatus | null;
  rating: number | null;
  updated_at: string;
  persistedTo: "supabase" | "wireframe-store";
}> {
  const now = new Date().toISOString();
  const normalizedRating =
    input.rating !== null && input.rating >= 1 && input.rating <= 10
      ? Math.round(input.rating)
      : null;

  // Always update wireframe store so unauthenticated / local preview stays live
  const store = getWireframeStore();
  const existingMedia = store.media.get(input.tmdb_id);
  store.media.set(input.tmdb_id, {
    tmdb_id: input.tmdb_id,
    title: input.title,
    media_type: input.media_type,
    poster_path: input.poster_path,
    backdrop_path: input.backdrop_path ?? existingMedia?.backdrop_path ?? null,
    release_date: input.release_date ?? existingMedia?.release_date ?? null,
    next_air_date: input.next_air_date ?? existingMedia?.next_air_date ?? null,
    next_episode_label: input.next_episode_label ?? existingMedia?.next_episode_label ?? null,
    overview: input.overview ?? existingMedia?.overview ?? null,
  });

  const existingUserMedia = store.userMedia.get(input.tmdb_id);
  const resolvedStatus: MediaStatus | null =
    input.status !== undefined
      ? input.status
      : (existingUserMedia?.status ?? "want_to_watch");

  if (resolvedStatus === null) {
    store.userMedia.delete(input.tmdb_id);
  } else {
    store.userMedia.set(input.tmdb_id, {
      tmdb_id: input.tmdb_id,
      status: resolvedStatus,
      rating: normalizedRating,
      updated_at: now,
    });
  }

  let persistedTo: "supabase" | "wireframe-store" = "wireframe-store";
  const { supabase, user } = await getAuthenticatedUser();

  if (supabase && user) {
    if (resolvedStatus === null) {
      // Remove from user_media junction table (effectively removes from library)
      const { error: deleteError } = await supabase
        .from("user_media")
        .delete()
        .match({ user_id: user.id, tmdb_id: input.tmdb_id });

      if (!deleteError) {
        persistedTo = "supabase";
      }
    } else {
      // 1. Upsert into `media` cache table with sanitized dates
      await supabase.from("media").upsert(
        {
          tmdb_id: input.tmdb_id,
          title: input.title,
          media_type: input.media_type,
          poster_path: input.poster_path,
          release_date: sanitizeDate(input.release_date),
          next_air_date: sanitizeDate(input.next_air_date ?? null),
          next_episode_label: input.next_episode_label ?? null,
          overview: input.overview ?? null,
          updated_at: now,
        },
        { onConflict: "tmdb_id" }
      );

      // 2. Upsert into `user_media` junction table
      const { error: userMediaError } = await supabase.from("user_media").upsert(
        {
          user_id: user.id,
          tmdb_id: input.tmdb_id,
          status: resolvedStatus,
          rating: normalizedRating,
          updated_at: now,
        },
        { onConflict: "user_id,tmdb_id" }
      );

      if (!userMediaError) {
        persistedTo = "supabase";
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/calendar");
  revalidatePath("/discover");

  return {
    ok: true,
    status: resolvedStatus,
    rating: resolvedStatus === null ? null : normalizedRating,
    updated_at: now,
    persistedTo,
  };
}

/**
 * Deprecated starter pack loader (demo data removed per user direction).
 */
export async function loadDemoDataAction(): Promise<{ ok: boolean; count: number }> {
  return { ok: true, count: 0 };
}

/**
 * Resets the user's tracker back to a clean slate (0 entries).
 */
export async function clearTrackerAction(): Promise<{ ok: boolean }> {
  const { supabase, user } = await getAuthenticatedUser();
  if (supabase && user) {
    try {
      await supabase.from("user_episodes").delete().eq("user_id", user.id);
      await supabase.from("user_media").delete().eq("user_id", user.id);
      revalidatePath("/");
      revalidatePath("/calendar");
      revalidatePath("/discover");
      return { ok: true };
    } catch {
      // Fall through
    }
  }

  clearWireframeStore();
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/discover");
  return { ok: true };
}

/**
 * Deliverable 4 episode checkbox mutation:
 * Updates `public.user_episodes` directly from the TV season/episode accordion.
 */
export async function toggleEpisodeWatchedAction(input: {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  tmdb_episode_id: number;
  season_number: number;
  episode_number: number;
  watched_boolean: boolean;
}): Promise<{
  ok: boolean;
  watched_boolean: boolean;
  watch_date: string | null;
  persistedTo: "supabase" | "wireframe-store";
}> {
  const watchDate = input.watched_boolean ? new Date().toISOString() : null;
  const store = getWireframeStore();

  store.userEpisodes.set(input.tmdb_episode_id, {
    tmdb_id: input.tmdb_id,
    tmdb_episode_id: input.tmdb_episode_id,
    season_number: input.season_number,
    episode_number: input.episode_number,
    watched_boolean: input.watched_boolean,
    watch_date: watchDate,
  });

  let persistedTo: "supabase" | "wireframe-store" = "wireframe-store";
  const { supabase, user } = await getAuthenticatedUser();

  if (supabase && user) {
    await supabase.from("media").upsert(
      {
        tmdb_id: input.tmdb_id,
        title: input.title,
        media_type: "tv",
        poster_path: input.poster_path,
      },
      { onConflict: "tmdb_id" }
    );

    const { error: epError } = await supabase.from("user_episodes").upsert(
      {
        user_id: user.id,
        tmdb_id: input.tmdb_id,
        tmdb_episode_id: input.tmdb_episode_id,
        season_number: input.season_number,
        episode_number: input.episode_number,
        watched_boolean: input.watched_boolean,
        watch_date: watchDate,
      },
      { onConflict: "user_id,tmdb_episode_id" }
    );

    if (!epError) {
      persistedTo = "supabase";
    }
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/calendar");
  revalidatePath("/discover");

  return {
    ok: true,
    watched_boolean: input.watched_boolean,
    watch_date: watchDate,
    persistedTo,
  };
}

/**
 * Bulk season episode checkbox mutation:
 * Updates all episodes for a TV season in `public.user_episodes` and wireframe store.
 */
export async function toggleSeasonWatchedAction(input: {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  season_number: number;
  episodes: Array<{
    tmdb_episode_id: number;
    episode_number: number;
  }>;
  watched_boolean: boolean;
}): Promise<{
  ok: boolean;
  season_number: number;
  watched_boolean: boolean;
  watch_date: string | null;
  count: number;
  persistedTo: "supabase" | "wireframe-store";
}> {
  const watchDate = input.watched_boolean ? new Date().toISOString() : null;
  const store = getWireframeStore();

  for (const ep of input.episodes) {
    store.userEpisodes.set(ep.tmdb_episode_id, {
      tmdb_id: input.tmdb_id,
      tmdb_episode_id: ep.tmdb_episode_id,
      season_number: input.season_number,
      episode_number: ep.episode_number,
      watched_boolean: input.watched_boolean,
      watch_date: watchDate,
    });
  }

  let persistedTo: "supabase" | "wireframe-store" = "wireframe-store";
  const { supabase, user } = await getAuthenticatedUser();

  if (supabase && user) {
    await supabase.from("media").upsert(
      {
        tmdb_id: input.tmdb_id,
        title: input.title,
        media_type: "tv",
        poster_path: input.poster_path,
      },
      { onConflict: "tmdb_id" }
    );

    const rows = input.episodes.map((ep) => ({
      user_id: user.id,
      tmdb_id: input.tmdb_id,
      tmdb_episode_id: ep.tmdb_episode_id,
      season_number: input.season_number,
      episode_number: ep.episode_number,
      watched_boolean: input.watched_boolean,
      watch_date: watchDate,
    }));

    const { error: epError } = await supabase.from("user_episodes").upsert(
      rows,
      { onConflict: "user_id,tmdb_episode_id" }
    );

    if (!epError) {
      persistedTo = "supabase";
    }
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/calendar");
  revalidatePath("/discover");

  return {
    ok: true,
    season_number: input.season_number,
    watched_boolean: input.watched_boolean,
    watch_date: watchDate,
    count: input.episodes.length,
    persistedTo,
  };
}

/**
 * Fetches TV seasons and episodes from TMDB API and merges them with `user_episodes`.
 */
export async function fetchTvSeasonsAction(
  tmdbId: number
): Promise<SeasonWireframeGroup[]> {
  const store = getWireframeStore();
  const episodeMap = new Map<number, UserEpisodeRecord>(store.userEpisodes);

  const { supabase, user } = await getAuthenticatedUser();
  if (supabase && user) {
    const { data: epRows } = await supabase
      .from("user_episodes")
      .select(
        "tmdb_id, tmdb_episode_id, season_number, episode_number, watched_boolean, watch_date"
      )
      .eq("user_id", user.id)
      .eq("tmdb_id", tmdbId);

    for (const row of epRows ?? []) {
      episodeMap.set(Number(row.tmdb_episode_id), {
        tmdb_id: Number(row.tmdb_id),
        tmdb_episode_id: Number(row.tmdb_episode_id),
        season_number: Number(row.season_number),
        episode_number: Number(row.episode_number),
        watched_boolean: Boolean(row.watched_boolean),
        watch_date: row.watch_date,
      });
    }
  }

  // Check store cache first to prevent redundant TMDB network calls
  const cachedSeasons = store.seasonsByMedia.get(tmdbId);
  if (cachedSeasons && cachedSeasons.length > 0) {
    // Re-apply latest user watch status to cached episodes
    return cachedSeasons.map((s) => ({
      ...s,
      episodes: s.episodes.map((ep) => {
        const saved = episodeMap.get(ep.tmdb_episode_id);
        return {
          ...ep,
          watched_boolean: saved?.watched_boolean ?? false,
          watch_date: saved?.watch_date ?? null,
        };
      }),
    }));
  }

  try {
    const showRes = await fetch(buildTmdbUrl(`/tv/${tmdbId}`), {
      headers: getTmdbHeaders(),
      cache: "no-store",
    });

    if (showRes.ok) {
      const showData = (await showRes.json()) as {
        number_of_seasons?: number;
        seasons?: Array<{
          season_number: number;
          name: string;
          episode_count?: number;
        }>;
      };

      const validSeasons = (showData.seasons ?? []).filter(
        (s) => s.season_number > 0
      );

      if (validSeasons.length > 0) {
        // Fetch all seasons using a controlled concurrency pool of 4 parallel requests
        const CONCURRENCY = 4;
        const seasonResults: SeasonWireframeGroup[] = new Array(validSeasons.length);
        let currentIndex = 0;

        async function fetchWorker() {
          while (currentIndex < validSeasons.length) {
            const index = currentIndex++;
            const s = validSeasons[index];

            try {
              const seasonRes = await fetch(
                buildTmdbUrl(`/tv/${tmdbId}/season/${s.season_number}`),
                {
                  headers: getTmdbHeaders(),
                  cache: "no-store",
                }
              );

              if (seasonRes.ok) {
                const seasonData = (await seasonRes.json()) as {
                  episodes?: Array<{
                    id: number;
                    episode_number: number;
                    name: string;
                    air_date?: string | null;
                  }>;
                };

                const episodes = (seasonData.episodes ?? []).map((ep) => {
                  const saved = episodeMap.get(ep.id);
                  return {
                    tmdb_episode_id: ep.id,
                    season_number: s.season_number,
                    episode_number: ep.episode_number,
                    title: ep.name || `Episode ${ep.episode_number}`,
                    air_date: ep.air_date ?? null,
                    watched_boolean: saved?.watched_boolean ?? false,
                    watch_date: saved?.watch_date ?? null,
                  };
                });

                seasonResults[index] = {
                  season_number: s.season_number,
                  name: s.name || `Season ${s.season_number}`,
                  episodes,
                };
                continue;
              }
            } catch {
              // Season fetch failed / network glitch fallback
            }

            // Fallback synthesis for individual season if fetch failed
            const epCount = s.episode_count || 4;
            const fallbackEpisodes = Array.from(
              { length: Math.min(epCount, 24) },
              (_, i) => {
                const epNum = i + 1;
                const synId = tmdbId * 10000 + s.season_number * 100 + epNum;
                const saved = episodeMap.get(synId);
                return {
                  tmdb_episode_id: synId,
                  season_number: s.season_number,
                  episode_number: epNum,
                  title: `Episode ${epNum}`,
                  air_date: null,
                  watched_boolean: saved?.watched_boolean ?? false,
                  watch_date: saved?.watch_date ?? null,
                };
              }
            );

            seasonResults[index] = {
              season_number: s.season_number,
              name: s.name || `Season ${s.season_number}`,
              episodes: fallbackEpisodes,
            };
          }
        }

        const workers = Array.from(
          { length: Math.min(CONCURRENCY, validSeasons.length) },
          () => fetchWorker()
        );
        await Promise.all(workers);

        const fetchedSeasons = seasonResults
          .filter((s): s is SeasonWireframeGroup => s !== null && s.episodes.length > 0)
          .sort((a, b) => a.season_number - b.season_number);

        if (fetchedSeasons.length > 0) {
          store.seasonsByMedia.set(tmdbId, fetchedSeasons);
          return fetchedSeasons;
        }
      }
    }
  } catch {
    // Fallback to synthetic TV seasons if TMDB seasons fetch fails
  }

  const fallback = buildDefaultSeasonsForTv(tmdbId, episodeMap);
  store.seasonsByMedia.set(tmdbId, fallback);
  return fallback;
}

/**
 * Fetches unified media detail for a single title by TMDB ID.
 * Merges TMDB live data (including backdrop_path and episodes) with user's tracking state and episode history.
 */
export async function getMediaDetailAction(
  tmdbId: number,
  mediaTypeHint?: "movie" | "tv"
): Promise<{
  media: MergedMediaItem | null;
  dataSource: "supabase" | "wireframe-store";
}> {
  const store = getWireframeStore();
  const existingMedia = store.media.get(tmdbId);
  const existingUserMedia = store.userMedia.get(tmdbId);

  const { supabase, user } = await getAuthenticatedUser();
  let userStatus: MediaStatus | null = existingUserMedia?.status ?? null;
  let userRating: number | null = existingUserMedia?.rating ?? null;
  let updatedAt: string | null = existingUserMedia?.updated_at ?? null;
  let dataSource: "supabase" | "wireframe-store" = "wireframe-store";

  let cachedMediaRow: {
    media_type?: string;
    title?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    release_date?: string | null;
    next_air_date?: string | null;
    next_episode_label?: string | null;
    overview?: string | null;
  } | null = null;

  if (supabase) {
    const { data: mediaRow } = await supabase
      .from("media")
      .select("media_type, title, poster_path, backdrop_path, release_date, next_air_date, next_episode_label, overview")
      .eq("tmdb_id", tmdbId)
      .maybeSingle();

    if (mediaRow) {
      cachedMediaRow = mediaRow;
    }
  }

  if (supabase && user) {
    dataSource = "supabase";
    const { data: userRow } = await supabase
      .from("user_media")
      .select("status, rating, updated_at")
      .eq("user_id", user.id)
      .eq("tmdb_id", tmdbId)
      .maybeSingle();

    if (userRow) {
      userStatus = userRow.status as MediaStatus;
      userRating = userRow.rating !== null ? Number(userRow.rating) : null;
      updatedAt = userRow.updated_at;
    }
  }

  if (!userStatus && supabase) {
    const { data: anyUserMedia } = await supabase
      .from("user_media")
      .select("status, rating")
      .eq("tmdb_id", tmdbId)
      .limit(1)
      .maybeSingle();

    if (anyUserMedia) {
      if (!userStatus) userStatus = anyUserMedia.status as MediaStatus;
      if (userRating === null && anyUserMedia.rating !== null) {
        userRating = Number(anyUserMedia.rating);
      }
    }
  }

  let hasTvEpisodes = false;
  if (store.userEpisodes) {
    for (const ep of store.userEpisodes.values()) {
      if (ep.tmdb_id === tmdbId) {
        hasTvEpisodes = true;
        break;
      }
    }
  }

  if (!hasTvEpisodes && supabase) {
    const { count } = await supabase
      .from("user_episodes")
      .select("id", { count: "exact", head: true })
      .eq("tmdb_id", tmdbId);

    if (count && count > 0) {
      hasTvEpisodes = true;
    }
  }

  // Determine media type: hint -> cached DB record -> wireframe store -> episodes/status heuristic -> default movie
  let mediaType: MediaType =
    mediaTypeHint ||
    (cachedMediaRow?.media_type as MediaType) ||
    existingMedia?.media_type ||
    (hasTvEpisodes || userStatus === "watching" ? "tv" : "movie");

  // Try fetching TMDB details for backdrop, high-res poster, full synopsis, release date
  let title = cachedMediaRow?.title || existingMedia?.title || `Media #${tmdbId}`;
  let posterPath = cachedMediaRow?.poster_path ?? existingMedia?.poster_path ?? null;
  let backdropPath = cachedMediaRow?.backdrop_path ?? existingMedia?.backdrop_path ?? null;
  let releaseDate = cachedMediaRow?.release_date ?? existingMedia?.release_date ?? null;
  let nextAirDate = cachedMediaRow?.next_air_date ?? existingMedia?.next_air_date ?? null;
  let nextEpisodeLabel = cachedMediaRow?.next_episode_label ?? existingMedia?.next_episode_label ?? null;
  let overview = cachedMediaRow?.overview ?? existingMedia?.overview ?? null;
  let tmdbRating = existingMedia?.tmdb_rating ?? null;
  let numberOfSeasons: number | undefined = existingMedia?.number_of_seasons;
  let numberOfEpisodes: number | undefined = existingMedia?.number_of_episodes;
  let seriesStatus: string | undefined = existingMedia?.series_status;
  let lastEpisodeToAir: {
    season_number: number;
    episode_number: number;
    name?: string;
    air_date?: string | null;
  } | null = existingMedia?.last_episode_to_air ?? null;
  let nextEpisodeToAir: {
    season_number: number;
    episode_number: number;
    name?: string;
    air_date?: string | null;
  } | null = existingMedia?.next_episode_to_air ?? null;

  try {
    let res: Response | null = null;
    let data: TmdbDetailPayload | null = null;

    if (!mediaTypeHint && !cachedMediaRow && !existingMedia) {
      // Concurrently probe both TV and Movie to resolve any TMDB ID collision
      const [tvRes, movieRes] = await Promise.all([
        fetch(buildTmdbUrl(`/tv/${tmdbId}`), { headers: getTmdbHeaders(), cache: "no-store" }),
        fetch(buildTmdbUrl(`/movie/${tmdbId}`), { headers: getTmdbHeaders(), cache: "no-store" }),
      ]);

      if (tvRes.ok && !movieRes.ok) {
        res = tvRes;
        mediaType = "tv";
      } else if (!tvRes.ok && movieRes.ok) {
        res = movieRes;
        mediaType = "movie";
      } else if (tvRes.ok && movieRes.ok) {
        // Both exist (ID collision, e.g. 61833)! Compare popularity & vote counts
        const tvData = await tvRes.json();
        const movieData = await movieRes.json();
        const tvPop = (tvData.vote_count || 0) * 10 + (tvData.popularity || 0);
        const moviePop = (movieData.vote_count || 0) * 10 + (movieData.popularity || 0);

        if (tvPop >= moviePop || userStatus === "watching" || hasTvEpisodes) {
          data = tvData;
          mediaType = "tv";
        } else {
          data = movieData;
          mediaType = "movie";
        }
      }
    } else {
      res = await fetch(buildTmdbUrl(`/${mediaType}/${tmdbId}`), {
        headers: getTmdbHeaders(),
        cache: "no-store",
      });

      if (!res.ok && !mediaTypeHint && !existingMedia) {
        const otherType: MediaType = mediaType === "movie" ? "tv" : "movie";
        const otherRes = await fetch(buildTmdbUrl(`/${otherType}/${tmdbId}`), {
          headers: getTmdbHeaders(),
          cache: "no-store",
        });
        if (otherRes.ok) {
          res = otherRes;
          mediaType = otherType;
        }
      }
    }

    if (res && res.ok && !data) {
      data = await res.json();
    }

    if (data) {
      title = data.title || data.name || title;
      posterPath = data.poster_path ?? posterPath;
      backdropPath = data.backdrop_path ?? backdropPath;
      releaseDate = data.release_date || data.first_air_date || releaseDate;
      overview = data.overview || overview;
      if (typeof data.vote_average === "number") {
        tmdbRating = Math.round(data.vote_average * 10) / 10;
      }

      if (mediaType === "tv") {
        numberOfSeasons = typeof data.number_of_seasons === "number" ? data.number_of_seasons : undefined;
        numberOfEpisodes = typeof data.number_of_episodes === "number" ? data.number_of_episodes : undefined;
        seriesStatus = data.status || undefined;

        if (data.last_episode_to_air) {
          lastEpisodeToAir = {
            season_number: data.last_episode_to_air.season_number,
            episode_number: data.last_episode_to_air.episode_number,
            name: data.last_episode_to_air.name,
            air_date: data.last_episode_to_air.air_date ?? null,
          };
        }

        if (data.next_episode_to_air) {
          nextAirDate = data.next_episode_to_air.air_date ?? null;
          nextEpisodeLabel = `S${String(data.next_episode_to_air.season_number).padStart(2, "0")}E${String(data.next_episode_to_air.episode_number).padStart(2, "0")} — ${data.next_episode_to_air.name || "TBA"}`;
          nextEpisodeToAir = {
            season_number: data.next_episode_to_air.season_number,
            episode_number: data.next_episode_to_air.episode_number,
            name: data.next_episode_to_air.name,
            air_date: data.next_episode_to_air.air_date ?? null,
          };
        } else {
          // Explicitly clear: show has no upcoming live episode scheduled
          nextAirDate = null;
          nextEpisodeLabel = null;
          nextEpisodeToAir = null;
        }
      }
    }
  } catch {
    // TMDB detail fetch failed; fallback to local cached data
  }

  // If TV, fetch full season and episode breakdown
  let seasons: SeasonWireframeGroup[] | undefined = undefined;
  if (mediaType === "tv") {
    seasons = await fetchTvSeasonsAction(tmdbId);
    if (!seasons || seasons.length === 0) {
      seasons = buildDefaultSeasonsForTv(tmdbId, store.userEpisodes, numberOfSeasons || 2);
    }
  }

  // Cache resolved record into wireframe store for instant re-lookup
  store.media.set(tmdbId, {
    tmdb_id: tmdbId,
    title,
    media_type: mediaType,
    poster_path: posterPath,
    backdrop_path: backdropPath,
    release_date: releaseDate,
    next_air_date: nextAirDate,
    next_episode_label: nextEpisodeLabel,
    overview,
    tmdb_rating: tmdbRating,
    number_of_seasons: numberOfSeasons,
    number_of_episodes: numberOfEpisodes,
    series_status: seriesStatus,
    last_episode_to_air: lastEpisodeToAir,
    next_episode_to_air: nextEpisodeToAir,
  });

  const mediaItem: MergedMediaItem = {
    tmdb_id: tmdbId,
    title,
    media_type: mediaType,
    poster_path: posterPath,
    backdrop_path: backdropPath,
    release_date: releaseDate,
    next_air_date: nextAirDate,
    next_episode_label: nextEpisodeLabel,
    overview,
    status: userStatus,
    rating: userRating,
    updated_at: updatedAt,
    tmdb_rating: tmdbRating,
    number_of_seasons: numberOfSeasons,
    number_of_episodes: numberOfEpisodes,
    series_status: seriesStatus,
    last_episode_to_air: lastEpisodeToAir,
    next_episode_to_air: nextEpisodeToAir,
    seasons,
  };

  return { media: mediaItem, dataSource };
}

// ============================================================================
// DELIVERABLE 2: WHAT TO WATCH NEXT DISCOVERY ENGINE
// ============================================================================

/**
 * Queries TMDB recommendations for a given seed with automatic fallback
 * to the /similar endpoint when recommendations return fewer than 10 items.
 */
async function fetchTmdbRecommendationsWithFallback(
  type: MediaType,
  tmdbId: number,
  page: number = 1
): Promise<RawTmdbRecommendation[]> {
  const collected: RawTmdbRecommendation[] = [];
  const seenIds = new Set<number>();

  try {
    // 1. Try recommendations endpoint
    const recUrl = buildTmdbUrl(`/${type}/${tmdbId}/recommendations`, {
      page: String(page),
      language: "en-US",
    });

    const recRes = await fetch(recUrl, {
      headers: getTmdbHeaders(),
      cache: "no-store",
    });

    if (recRes.ok) {
      const recJson = (await recRes.json()) as {
        results?: Array<
          TmdbRawResult & { genre_ids?: number[] }
        >;
      };

      for (const item of recJson.results ?? []) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          collected.push({
            tmdb_id: item.id,
            title: item.title || item.name || `Untitled #${item.id}`,
            media_type: type,
            poster_path: item.poster_path ?? null,
            release_date: item.release_date || item.first_air_date || null,
            overview: item.overview ?? null,
            genre_ids: item.genre_ids ?? [],
            tmdb_rating:
              typeof item.vote_average === "number"
                ? Math.round(item.vote_average * 10) / 10
                : null,
          });
        }
      }
    }

    // 2. If fewer than 10, fallback to /similar endpoint
    if (collected.length < 10) {
      const simUrl = buildTmdbUrl(`/${type}/${tmdbId}/similar`, {
        page: String(page),
        language: "en-US",
      });

      const simRes = await fetch(simUrl, {
        headers: getTmdbHeaders(),
        cache: "no-store",
      });

      if (simRes.ok) {
        const simJson = (await simRes.json()) as {
          results?: Array<
            TmdbRawResult & { genre_ids?: number[] }
          >;
        };

        for (const item of simJson.results ?? []) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            collected.push({
              tmdb_id: item.id,
              title: item.title || item.name || `Untitled #${item.id}`,
              media_type: type,
              poster_path: item.poster_path ?? null,
              release_date: item.release_date || item.first_air_date || null,
              overview: item.overview ?? null,
              genre_ids: item.genre_ids ?? [],
              tmdb_rating:
                typeof item.vote_average === "number"
                  ? Math.round(item.vote_average * 10) / 10
                  : null,
            });
          }
        }
      }
    }
  } catch {
    // Offline / sandbox / network unreachable fallback
  }

  return collected;
}

/**
 * Resolves title for a seed ID by checking local cache first, then TMDB API.
 */
async function resolveSeedTitle(
  tmdbId: number,
  type: MediaType
): Promise<string> {
  const store = getWireframeStore();
  const cached = store.media.get(tmdbId);
  if (cached?.title) {
    return cached.title;
  }

  try {
    const url = buildTmdbUrl(`/${type}/${tmdbId}`, { language: "en-US" });
    const res = await fetch(url, {
      headers: getTmdbHeaders(),
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { title?: string; name?: string };
      return data.title || data.name || `${type === "movie" ? "Movie" : "TV Show"} #${tmdbId}`;
    }
  } catch {
    // network fallback
  }

  return `${type === "movie" ? "Movie" : "TV Show"} #${tmdbId}`;
}

function matchesEra(dateStr: string | null | undefined, eraKey?: string): boolean {
  if (!eraKey || eraKey === "all") return true;
  if (!dateStr) return false;
  const year = parseInt(dateStr.slice(0, 4), 10);
  if (isNaN(year)) return false;

  const eraDef = DISCOVERY_ERAS.find((e) => e.key === eraKey);
  if (!eraDef) return true;
  if (eraDef.startYear !== undefined && eraDef.endYear !== undefined) {
    return year >= eraDef.startYear && year <= eraDef.endYear;
  }
  return true;
}

async function fetchTmdbDiscoverFallback(
  type: MediaType,
  eraKey: string,
  genreId?: number | null,
  page = 1
): Promise<DiscoveredFallbackItem[]> {
  const eraDef = DISCOVERY_ERAS.find((e) => e.key === eraKey);
  const queryParams: Record<string, string> = {
    language: "en-US",
    sort_by: "popularity.desc",
    page: String(page),
  };

  if (genreId) {
    queryParams.with_genres = String(genreId);
  }

  if (eraDef && eraDef.startYear !== undefined && eraDef.endYear !== undefined) {
    if (type === "movie") {
      queryParams["primary_release_date.gte"] = `${eraDef.startYear}-01-01`;
      queryParams["primary_release_date.lte"] = `${eraDef.endYear}-12-31`;
    } else {
      queryParams["first_air_date.gte"] = `${eraDef.startYear}-01-01`;
      queryParams["first_air_date.lte"] = `${eraDef.endYear}-12-31`;
    }
  }

  try {
    const url = buildTmdbUrl(`/discover/${type}`, queryParams);
    const res = await fetch(url, {
      headers: getTmdbHeaders(),
      cache: "no-store",
    });
    if (res.ok) {
      const json = (await res.json()) as { results?: TmdbRawResult[] };
      return (json.results ?? []).map((item) => ({
        id: item.id,
        title: item.title || item.name || `Untitled #${item.id}`,
        media_type: type,
        poster_path: item.poster_path ?? null,
        release_date: item.release_date || item.first_air_date || null,
        overview: item.overview ?? null,
        genre_ids: (item as unknown as { genre_ids?: number[] }).genre_ids ?? [],
        tmdb_rating:
          typeof item.vote_average === "number"
            ? Math.round(item.vote_average * 10) / 10
            : null,
      }));
    }
  } catch {
    // network fallback
  }

  return [];
}

/**
 * Deliverable 2: What to Watch Next server-side Discovery Engine.
 * Supports WHAT MOVIE TO WATCH NEXT and WHAT TV SHOW TO WATCH NEXT.
 * Handles Era/Decade filtering and URL vs Auto-Pilot seeds.
 */
export async function getDiscoveryRecommendationsAction(params: {
  mediaType?: MediaType;
  seedId?: number;
  seedType?: MediaType;
  genreKey?: string;
  eraKey?: string;
  page?: number;
  shuffle?: boolean;
  currentSeedId?: number;
}): Promise<DiscoveryEngineResult> {
  const store = getWireframeStore();
  const { supabase, user } = await getAuthenticatedUser();
  const activeType: MediaType = params.mediaType || params.seedType || "movie";
  const activeEra: string = params.eraKey || "all";
  const genreKey: string = params.genreKey || "all";
  const page = params.page && params.page > 0 ? params.page : 1;

  // --------------------------------------------------------------------------
  // STEP 1: Find Active Seed (URL Seed vs Auto-Pilot)
  // --------------------------------------------------------------------------
  let seedId: number | null = null;
  let isUrlSeed = false;

  if (params.seedId && (!params.seedType || params.seedType === activeType)) {
    seedId = params.seedId;
    isUrlSeed = true;
  }

  // If not seeded via URL, pick from user's rated library (preferring 8+, falling back to any rated item)
  if (!seedId) {
    const highRatedCandidates: number[] = [];

    if (supabase && user) {
      try {
        const { data: rows } = await supabase
          .from("user_media")
          .select("tmdb_id, rating, media:tmdb_id (media_type)")
          .eq("user_id", user.id)
          .not("rating", "is", null)
          .order("rating", { ascending: false });

        if (rows) {
          const eightsAndAbove: number[] = [];
          const allRated: number[] = [];

          for (const row of rows) {
            const mediaObj = Array.isArray(row.media) ? row.media[0] : row.media;
            const rowMediaType = mediaObj?.media_type as MediaType | undefined;
            if (rowMediaType === activeType) {
              const tmdbIdNum = Number(row.tmdb_id);
              allRated.push(tmdbIdNum);
              if (Number(row.rating) >= 8) {
                eightsAndAbove.push(tmdbIdNum);
              }
            }
          }

          if (eightsAndAbove.length > 0) {
            highRatedCandidates.push(...eightsAndAbove);
          } else if (allRated.length > 0) {
            highRatedCandidates.push(...allRated);
          }
        }
      } catch {
        // fallback
      }
    }

    if (highRatedCandidates.length === 0) {
      const eights: number[] = [];
      const allRated: number[] = [];
      for (const [id, userRecord] of store.userMedia.entries()) {
        if (userRecord.rating !== null && userRecord.rating >= 1) {
          const mediaRecord = store.media.get(id);
          if (mediaRecord?.media_type === activeType) {
            allRated.push(id);
            if (userRecord.rating >= 8) {
              eights.push(id);
            }
          }
        }
      }
      if (eights.length > 0) {
        highRatedCandidates.push(...eights);
      } else if (allRated.length > 0) {
        highRatedCandidates.push(...allRated);
      }
    }

    // If user has no rated titles for this media type and didn't provide a manual seed,
    // do not fabricate fake recommendations. Return standby state prompting them to rate media.
    if (highRatedCandidates.length === 0) {
      return {
        mediaType: activeType,
        suggestions: [],
        seed: null,
        noRatedMedia: true,
        dataSource: "none",
      };
    }

    const pool = highRatedCandidates;
    const previousId = params.currentSeedId;

    const available =
      params.shuffle && previousId && pool.length > 1
        ? pool.filter((id) => id !== previousId)
        : pool;

    seedId = available[Math.floor(Math.random() * available.length)];
  }

  // --------------------------------------------------------------------------
  // STEP 2: Fetch Recommendations from TMDB (with Fallback)
  // --------------------------------------------------------------------------
  const [rawRecs, seedTitle] = await Promise.all([
    fetchTmdbRecommendationsWithFallback(activeType, seedId, page),
    resolveSeedTitle(seedId, activeType),
  ]);

  const usedTmdb = rawRecs.length > 0;
  const genreDef = DISCOVERY_GENRES.find((g) => g.key === genreKey);
  const targetGenreId =
    genreDef
      ? activeType === "movie"
        ? genreDef.movieGenreId
        : genreDef.tvGenreId
      : null;

  // Filter recommendations by Genre and Era
  const seenIds = new Set<number>([seedId]);
  const collectedPool: Array<{
    tmdb_id: number;
    title: string;
    media_type: MediaType;
    poster_path: string | null;
    release_date: string | null;
    overview: string | null;
    genre_ids: number[];
    tmdb_rating: number | null;
  }> = [];

  for (const item of rawRecs) {
    if (seenIds.has(item.tmdb_id)) continue;
    seenIds.add(item.tmdb_id);

    const genreMatch = targetGenreId ? item.genre_ids.includes(targetGenreId) : true;
    const eraMatch = matchesEra(item.release_date, activeEra);

    if (genreMatch && eraMatch) {
      collectedPool.push({
        tmdb_id: item.tmdb_id,
        title: item.title,
        media_type: item.media_type,
        poster_path: item.poster_path ?? null,
        release_date: item.release_date ?? null,
        overview: item.overview ?? null,
        genre_ids: item.genre_ids,
        tmdb_rating: item.tmdb_rating ?? null,
      });
    }
  }

  // --------------------------------------------------------------------------
  // STEP 3: If recommendations are sparse for this Era/Genre, query TMDB Discover
  // --------------------------------------------------------------------------
  if (collectedPool.length < 15) {
    const discoverResults = await fetchTmdbDiscoverFallback(
      activeType,
      activeEra,
      targetGenreId,
      page
    );

    for (const d of discoverResults) {
      if (!seenIds.has(d.id)) {
        seenIds.add(d.id);
        collectedPool.push({
          tmdb_id: d.id,
          title: d.title || `Untitled #${d.id}`,
          media_type: activeType,
          poster_path: d.poster_path ?? null,
          release_date: d.release_date ?? null,
          overview: d.overview ?? null,
          genre_ids: d.genre_ids,
          tmdb_rating: d.tmdb_rating ?? null,
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // STEP 4: Wireframe Store Fallback (Guaranteed offline / mock items)
  // --------------------------------------------------------------------------
  if (collectedPool.length < 10) {
    const fallbackItems = Array.from(store.media.values())
      .filter((m) => m.media_type === activeType && m.tmdb_id !== seedId)
      .filter((m) => (targetGenreId ? (m.genre_ids ?? []).includes(targetGenreId) : true))
      .filter((m) => matchesEra(m.release_date, activeEra))
      .map((m) => ({
        tmdb_id: m.tmdb_id,
        title: m.title,
        media_type: activeType,
        poster_path: m.poster_path,
        release_date: m.release_date ?? null,
        overview: m.overview ?? null,
        genre_ids: m.genre_ids ?? [],
        tmdb_rating: m.tmdb_rating ?? null,
      }));

    for (const fb of fallbackItems) {
      if (!seenIds.has(fb.tmdb_id)) {
        seenIds.add(fb.tmdb_id);
        collectedPool.push(fb);
      }
    }
  }

  // Limit to 20 items for a generous 4-row grid
  const finalCandidates = collectedPool.slice(0, 20);

  // --------------------------------------------------------------------------
  // STEP 5: Cross-reference with user library (Supabase or Store)
  // --------------------------------------------------------------------------
  const allTmdbIds = finalCandidates.map((c) => c.tmdb_id);
  const { lookup: userMediaLookup } = await getUserMediaLookup(allTmdbIds);

  const suggestions: MergedMediaItem[] = finalCandidates.map((raw) => {
    const matched = userMediaLookup.get(raw.tmdb_id);
    return {
      tmdb_id: raw.tmdb_id,
      title: raw.title,
      media_type: activeType,
      poster_path: raw.poster_path,
      release_date: raw.release_date,
      overview: raw.overview,
      status: matched?.status ?? null,
      rating: matched?.rating ?? null,
      updated_at: matched?.updated_at ?? null,
      genre_ids: raw.genre_ids,
      tmdb_rating: raw.tmdb_rating ?? null,
      seasons:
        activeType === "tv"
          ? buildDefaultSeasonsForTv(raw.tmdb_id, store.userEpisodes)
          : undefined,
    };
  });

  const seedInfo: DiscoverySeedInfo = {
    id: seedId,
    title: seedTitle,
    media_type: activeType,
    isUrlSeed,
  };

  return {
    mediaType: activeType,
    suggestions,
    seed: seedInfo,
    dataSource: usedTmdb ? "tmdb" : "wireframe-store",
  };
}


