import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  MediaRecord,
  MergedMediaItem,
  SeasonWireframeGroup,
  UserEpisodeRecord,
  UserMediaRecord,
  WireframeStore,
} from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
      },
    });
  }
  return supabaseInstance;
}

// ============================================================================
// STRUCTURAL WIREFRAME SEED STORE (Fallback when Supabase env is not yet set
// or user is browsing unauthenticated in wireframe mode)
// ============================================================================

// Clean slate: all demo and starter pack media removed per user direction.
const initialMedia: MediaRecord[] = [];

export const DEMO_MEDIA: MediaRecord[] = [];
export const DEMO_USER_MEDIA: UserMediaRecord[] = [];
export const DEMO_USER_EPISODES: UserEpisodeRecord[] = [];

declare global {
  var __koaxWireframeStore: WireframeStore | undefined;
}

export function getWireframeStore(): WireframeStore {
  if (!globalThis.__koaxWireframeStore) {
    const mediaMap = new Map<number, MediaRecord>();
    for (const m of initialMedia) {
      mediaMap.set(m.tmdb_id, m);
    }

    // Clean slate by default: tracker starts empty until user logs or loads demo data
    const userMediaMap = new Map<number, UserMediaRecord>();
    const userEpisodesMap = new Map<number, UserEpisodeRecord>();

    globalThis.__koaxWireframeStore = {
      media: mediaMap,
      userMedia: userMediaMap,
      userEpisodes: userEpisodesMap,
      seasonsByMedia: new Map(),
    };
  } else {
    // Backfill any newly added fields (like overview) for existing items
    for (const m of initialMedia) {
      const existing = globalThis.__koaxWireframeStore.media.get(m.tmdb_id);
      if (existing) {
        if (!existing.overview && m.overview) {
          existing.overview = m.overview;
        }
      } else {
        globalThis.__koaxWireframeStore.media.set(m.tmdb_id, m);
      }
    }
  }
  return globalThis.__koaxWireframeStore;
}

export function populateWireframeDemoData(): void {
  const store = getWireframeStore();
  for (const um of DEMO_USER_MEDIA) {
    store.userMedia.set(um.tmdb_id, um);
  }
  for (const ue of DEMO_USER_EPISODES) {
    store.userEpisodes.set(ue.tmdb_episode_id, ue);
  }
}

export function clearWireframeStore(): void {
  const store = getWireframeStore();
  store.userMedia.clear();
  store.userEpisodes.clear();
}

export function buildDefaultSeasonsForTv(
  tmdbId: number,
  episodeStateMap: Map<number, UserEpisodeRecord>,
  seasonCount: number = 2
): SeasonWireframeGroup[] {
  const count = Math.max(1, Math.min(seasonCount, 30));
  const seasonNumbers = Array.from({ length: count }, (_, i) => i + 1);
  const seasons: SeasonWireframeGroup[] = seasonNumbers.map((seasonNum) => ({
    season_number: seasonNum,
    name: `Season ${seasonNum}`,
    episodes: [1, 2, 3, 4].map((epNum) => {
      const syntheticEpId = tmdbId * 10000 + seasonNum * 100 + epNum;
      const saved = episodeStateMap.get(syntheticEpId);
      return {
        tmdb_episode_id: syntheticEpId,
        season_number: seasonNum,
        episode_number: epNum,
        title: `Episode ${epNum}`,
        air_date:
          seasonNum === 1
            ? `2024-0${epNum}-10`
            : `2026-11-0${epNum * 2}`,
        watched_boolean: saved?.watched_boolean ?? false,
        watch_date: saved?.watch_date ?? null,
      };
    }),
  }));
  return seasons;
}

export function getMergedSeedItems(): MergedMediaItem[] {
  const store = getWireframeStore();
  const items: MergedMediaItem[] = [];

  for (const [tmdbId, userMedia] of store.userMedia.entries()) {
    const media = store.media.get(tmdbId);
    if (!media) continue;

    const seasons =
      media.media_type === "tv"
        ? buildDefaultSeasonsForTv(tmdbId, store.userEpisodes)
        : undefined;

    items.push({
      tmdb_id: media.tmdb_id,
      title: media.title,
      media_type: media.media_type,
      poster_path: media.poster_path,
      backdrop_path: media.backdrop_path ?? null,
      release_date: media.release_date ?? null,
      next_air_date: media.next_air_date ?? media.release_date ?? null,
      next_episode_label: media.next_episode_label ?? null,
      overview: media.overview ?? null,
      status: userMedia.status,
      rating: userMedia.rating,
      updated_at: userMedia.updated_at,
      seasons,
      tmdb_rating: media.tmdb_rating ?? null,
    });
  }

  return items.sort((a, b) =>
    (b.updated_at || "").localeCompare(a.updated_at || "")
  );
}

