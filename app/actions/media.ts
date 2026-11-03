"use server";

import { revalidatePath } from "next/cache";
import {
  buildDefaultSeasonsForTv,
  getMergedSeedItems,
  getSupabaseClient,
  getWireframeStore,
  isSupabaseConfigured,
} from "@/lib/supabase";
import {
  MediaStatus,
  MediaType,
  MergedMediaItem,
  SeasonWireframeGroup,
  UserEpisodeRecord,
  UserMediaRecord,
} from "@/lib/types";

interface TmdbRawResult {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
}

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
    release_date: string | null;
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
          release_date: item.release_date || item.first_air_date || null,
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
        });
      }
    }
  }

  const tmdbIds = rawMediaResults.map((r) => r.tmdb_id);
  const userMediaLookup = new Map<number, UserMediaRecord>();
  const store = getWireframeStore();
  let usedSupabase = false;

  const supabase = getSupabaseClient();
  if (supabase && tmdbIds.length > 0) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let queryBuilder = supabase
      .from("user_media")
      .select("tmdb_id, status, rating, updated_at")
      .in("tmdb_id", tmdbIds);

    if (user) {
      queryBuilder = queryBuilder.eq("user_id", user.id);
    }

    const { data: userMediaRows, error } = await queryBuilder;
    if (!error && userMediaRows) {
      usedSupabase = true;
      for (const row of userMediaRows) {
        userMediaLookup.set(Number(row.tmdb_id), {
          tmdb_id: Number(row.tmdb_id),
          status: row.status as MediaStatus,
          rating: row.rating !== null ? Number(row.rating) : null,
          updated_at: row.updated_at,
        });
      }
    }
  }

  // Also cross-reference wireframe store when Supabase isn't active yet
  if (!usedSupabase) {
    for (const id of tmdbIds) {
      const localMatch = store.userMedia.get(id);
      if (localMatch) {
        userMediaLookup.set(id, localMatch);
      }
    }
  }

  const mergedItems: MergedMediaItem[] = rawMediaResults.map((raw) => {
    const matched = userMediaLookup.get(raw.tmdb_id);
    return {
      tmdb_id: raw.tmdb_id,
      title: raw.title,
      media_type: raw.media_type,
      poster_path: raw.poster_path,
      release_date: raw.release_date,
      status: matched?.status ?? null,
      rating: matched?.rating ?? null,
      updated_at: matched?.updated_at ?? null,
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
  const supabase = getSupabaseClient();
  const store = getWireframeStore();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: rows, error } = await supabase
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
            next_episode_label
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

      if (!error && rows) {
        const items: MergedMediaItem[] = rows.map((row) => {
          const mediaObj = Array.isArray(row.media) ? row.media[0] : row.media;
          const tmdbId = Number(row.tmdb_id);
          const mediaType = (mediaObj?.media_type as MediaType) || "movie";

          return {
            tmdb_id: tmdbId,
            title: mediaObj?.title || `Media #${tmdbId}`,
            media_type: mediaType,
            poster_path: mediaObj?.poster_path ?? null,
            release_date: mediaObj?.release_date ?? null,
            next_air_date:
              mediaObj?.next_air_date ?? mediaObj?.release_date ?? null,
            next_episode_label: mediaObj?.next_episode_label ?? null,
            status: row.status as MediaStatus,
            rating: row.rating !== null ? Number(row.rating) : null,
            updated_at: row.updated_at,
            seasons:
              mediaType === "tv"
                ? buildDefaultSeasonsForTv(tmdbId, episodeMap)
                : undefined,
          };
        });

        return { items, dataSource: "supabase" };
      }
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
  release_date?: string | null;
  next_air_date?: string | null;
  next_episode_label?: string | null;
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
    release_date: input.release_date ?? existingMedia?.release_date ?? null,
    next_air_date:
      input.next_air_date ??
      existingMedia?.next_air_date ??
      input.release_date ??
      "2026-11-15",
    next_episode_label:
      input.next_episode_label ??
      existingMedia?.next_episode_label ??
      (input.media_type === "tv" ? "NEXT EPISODE SCHEDULED" : "UPCOMING RELEASE"),
  });

  const existingUserMedia = store.userMedia.get(input.tmdb_id);
  const resolvedStatus: MediaStatus | null =
    input.status ?? existingUserMedia?.status ?? "want_to_watch";

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
  const supabase = getSupabaseClient();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // 1. Upsert into `media` cache table
      await supabase.from("media").upsert(
        {
          tmdb_id: input.tmdb_id,
          title: input.title,
          media_type: input.media_type,
          poster_path: input.poster_path,
          release_date: input.release_date ?? null,
          next_air_date: input.next_air_date ?? input.release_date ?? null,
          next_episode_label: input.next_episode_label ?? null,
          updated_at: now,
        },
        { onConflict: "tmdb_id" }
      );

      // 2. Upsert into `user_media` junction table
      const { error } = await supabase.from("user_media").upsert(
        {
          user_id: user.id,
          tmdb_id: input.tmdb_id,
          status: resolvedStatus,
          rating: normalizedRating,
          updated_at: now,
        },
        { onConflict: "user_id,tmdb_id" }
      );

      if (!error) {
        persistedTo = "supabase";
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/calendar");

  return {
    ok: true,
    status: resolvedStatus,
    rating: normalizedRating,
    updated_at: now,
    persistedTo,
  };
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
  const supabase = getSupabaseClient();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("media").upsert(
        {
          tmdb_id: input.tmdb_id,
          title: input.title,
          media_type: "tv",
          poster_path: input.poster_path,
        },
        { onConflict: "tmdb_id" }
      );

      const { error } = await supabase.from("user_episodes").upsert(
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

      if (!error) {
        persistedTo = "supabase";
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/calendar");

  return {
    ok: true,
    watched_boolean: input.watched_boolean,
    watch_date: watchDate,
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

  const supabase = getSupabaseClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
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
  }

  try {
    const showRes = await fetch(buildTmdbUrl(`/tv/${tmdbId}`), {
      headers: getTmdbHeaders(),
      cache: "no-store",
    });

    if (showRes.ok) {
      const showData = (await showRes.json()) as {
        seasons?: Array<{ season_number: number; name: string }>;
      };

      const validSeasons = (showData.seasons ?? [])
        .filter((s) => s.season_number > 0)
        .slice(0, 3);

      if (validSeasons.length > 0) {
        const fetchedSeasons: SeasonWireframeGroup[] = [];
        for (const s of validSeasons) {
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

            fetchedSeasons.push({
              season_number: s.season_number,
              name: s.name || `Season ${s.season_number}`,
              episodes,
            });
          }
        }

        if (fetchedSeasons.length > 0) {
          return fetchedSeasons;
        }
      }
    }
  } catch {
    // Fallback to structural wireframe seasons
  }

  return buildDefaultSeasonsForTv(tmdbId, episodeMap);
}

