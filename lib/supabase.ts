import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  MediaRecord,
  MergedMediaItem,
  SeasonWireframeGroup,
  UserEpisodeRecord,
  UserMediaRecord,
} from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
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

interface WireframeStore {
  media: Map<number, MediaRecord>;
  userMedia: Map<number, UserMediaRecord>;
  userEpisodes: Map<number, UserEpisodeRecord>;
  seasonsByMedia: Map<number, SeasonWireframeGroup[]>;
}

const initialMedia: MediaRecord[] = [
  {
    tmdb_id: 95396,
    title: "Severance",
    media_type: "tv",
    poster_path: "/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg",
    release_date: "2022-02-17",
    next_air_date: "2026-11-06",
    next_episode_label: "S02E04 — Woe's Hollow",
  },
  {
    tmdb_id: 136315,
    title: "The Bear",
    media_type: "tv",
    poster_path: "/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg",
    release_date: "2022-06-23",
    next_air_date: "2026-11-08",
    next_episode_label: "S04E02 — Brigade",
  },
  {
    tmdb_id: 83867,
    title: "Andor",
    media_type: "tv",
    poster_path: "/59SVNwLfoMnZPPB6ukW6dlPxAdI.jpg",
    release_date: "2022-09-21",
    next_air_date: "2026-11-11",
    next_episode_label: "S02E07 — One Way Out II",
  },
  {
    tmdb_id: 696506,
    title: "Mickey 17",
    media_type: "movie",
    poster_path: "/edKpE9B5qN3e559OuMCLZdW1iBZ.jpg",
    release_date: "2026-11-13",
    next_air_date: "2026-11-13",
    next_episode_label: "THEATRICAL RELEASE",
  },
  {
    tmdb_id: 426063,
    title: "Nosferatu",
    media_type: "movie",
    poster_path: "/5qGIxdEO841C0tdY8vOdLoRVrr0.jpg",
    release_date: "2026-11-20",
    next_air_date: "2026-11-20",
    next_episode_label: "THEATRICAL RELEASE",
  },
  {
    tmdb_id: 693134,
    title: "Dune: Part Two",
    media_type: "movie",
    poster_path: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    release_date: "2024-02-27",
  },
  {
    tmdb_id: 335984,
    title: "Blade Runner 2049",
    media_type: "movie",
    poster_path: "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    release_date: "2017-10-04",
  },
];

const initialUserMedia: UserMediaRecord[] = [
  {
    tmdb_id: 95396,
    status: "watching",
    rating: 9,
    updated_at: "2026-11-03T12:00:00.000Z",
  },
  {
    tmdb_id: 136315,
    status: "watching",
    rating: 8,
    updated_at: "2026-11-02T18:30:00.000Z",
  },
  {
    tmdb_id: 83867,
    status: "watching",
    rating: 10,
    updated_at: "2026-11-01T20:15:00.000Z",
  },
  {
    tmdb_id: 696506,
    status: "want_to_watch",
    rating: null,
    updated_at: "2026-11-03T09:00:00.000Z",
  },
  {
    tmdb_id: 426063,
    status: "want_to_watch",
    rating: null,
    updated_at: "2026-10-30T15:00:00.000Z",
  },
  {
    tmdb_id: 693134,
    status: "watched",
    rating: 9,
    updated_at: "2026-10-28T21:00:00.000Z",
  },
  {
    tmdb_id: 335984,
    status: "watched",
    rating: 10,
    updated_at: "2026-10-25T22:00:00.000Z",
  },
];

const initialUserEpisodes: UserEpisodeRecord[] = [
  {
    tmdb_id: 95396,
    tmdb_episode_id: 953960101,
    season_number: 1,
    episode_number: 1,
    watched_boolean: true,
    watch_date: "2026-10-20T20:00:00.000Z",
  },
  {
    tmdb_id: 95396,
    tmdb_episode_id: 953960102,
    season_number: 1,
    episode_number: 2,
    watched_boolean: true,
    watch_date: "2026-10-21T20:00:00.000Z",
  },
  {
    tmdb_id: 95396,
    tmdb_episode_id: 953960201,
    season_number: 2,
    episode_number: 1,
    watched_boolean: true,
    watch_date: "2026-11-01T20:00:00.000Z",
  },
];

declare global {
  var __koaxWireframeStore: WireframeStore | undefined;
}

export function getWireframeStore(): WireframeStore {
  if (!globalThis.__koaxWireframeStore) {
    const mediaMap = new Map<number, MediaRecord>();
    for (const m of initialMedia) {
      mediaMap.set(m.tmdb_id, m);
    }

    const userMediaMap = new Map<number, UserMediaRecord>();
    for (const um of initialUserMedia) {
      userMediaMap.set(um.tmdb_id, um);
    }

    const userEpisodesMap = new Map<number, UserEpisodeRecord>();
    for (const ue of initialUserEpisodes) {
      userEpisodesMap.set(ue.tmdb_episode_id, ue);
    }

    globalThis.__koaxWireframeStore = {
      media: mediaMap,
      userMedia: userMediaMap,
      userEpisodes: userEpisodesMap,
      seasonsByMedia: new Map(),
    };
  }
  return globalThis.__koaxWireframeStore;
}

export function buildDefaultSeasonsForTv(
  tmdbId: number,
  episodeStateMap: Map<number, UserEpisodeRecord>
): SeasonWireframeGroup[] {
  const seasons: SeasonWireframeGroup[] = [1, 2].map((seasonNum) => ({
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
      release_date: media.release_date ?? null,
      next_air_date: media.next_air_date ?? media.release_date ?? null,
      next_episode_label: media.next_episode_label ?? null,
      status: userMedia.status,
      rating: userMedia.rating,
      updated_at: userMedia.updated_at,
      seasons,
    });
  }

  return items.sort((a, b) =>
    (b.updated_at || "").localeCompare(a.updated_at || "")
  );
}

