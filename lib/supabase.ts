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
    overview:
      "Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives. When a mysterious colleague appears outside of work, it begins a journey to discover the truth about their jobs.",
    genre_ids: [10765, 18],
    tmdb_rating: 8.4,
  },
  {
    tmdb_id: 136315,
    title: "The Bear",
    media_type: "tv",
    poster_path: "/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg",
    release_date: "2022-06-23",
    next_air_date: "2026-11-08",
    next_episode_label: "S04E02 — Brigade",
    overview:
      "A young fine-dining chef comes home to Chicago to run his family Italian beef sandwich shop after a tragic death. A world away from what he's used to, Carmy must balance the soul-crushing realities of small business ownership.",
    genre_ids: [35, 18],
    tmdb_rating: 8.7,
  },
  {
    tmdb_id: 83867,
    title: "Andor",
    media_type: "tv",
    poster_path: "/59SVNwLfoMnZPPB6ukW6dlPxAdI.jpg",
    release_date: "2022-09-21",
    next_air_date: "2026-11-11",
    next_episode_label: "S02E07 — One Way Out II",
    overview:
      "The Andor series explores a new perspective from the Star Wars galaxy, focusing on Cassian Andor's journey to discover the difference he can make in an era filled with danger, deception and intrigue against the burgeoning Galactic Empire.",
    genre_ids: [10765, 10759],
    tmdb_rating: 8.2,
  },
  {
    tmdb_id: 76331,
    title: "Succession",
    media_type: "tv",
    poster_path: "/7HW473ahJ70A7Jj5q8w2Dq9Xw2L.jpg",
    release_date: "2018-06-03",
    overview:
      "The Roy family is known for controlling the biggest media and entertainment company in the world. However, their world changes when their aging father steps down from the company.",
    genre_ids: [18],
    tmdb_rating: 8.9,
  },
  {
    tmdb_id: 126308,
    title: "Shōgun",
    media_type: "tv",
    poster_path: "/7O4iVfOMQmdCSxhOg1WNzG1AgYT.jpg",
    release_date: "2024-02-27",
    overview:
      "When a mysterious European ship is found marooned in a nearby fishing village, Lord Yoshii Toranaga discovers secrets that could tip the scales of power and devastate his formidable enemies.",
    genre_ids: [18, 10759],
    tmdb_rating: 8.5,
  },
  {
    tmdb_id: 106379,
    title: "Fallout",
    media_type: "tv",
    poster_path: "/Ansikx9DpTmHgslWQvBTnRzSaEB.jpg",
    release_date: "2024-04-10",
    overview:
      "The story of haves and have-nots in a world in which there's almost nothing left to have. 200 years after the apocalypse, the gentle denizens of luxury fallout shelters are forced to return to the irradiated hellscape their ancestors left behind.",
    genre_ids: [10765, 10759],
    tmdb_rating: 8.4,
  },
  {
    tmdb_id: 42009,
    title: "Fargo",
    media_type: "tv",
    poster_path: "/7t0f3y6c3g0W446c2oU9569u6xQ.jpg",
    release_date: "2014-04-15",
    overview:
      "A close-knit anthology series following various quirky characters and chronicles of deceptive crime across Minnesota and North Dakota.",
    genre_ids: [18, 80],
    tmdb_rating: 8.6,
  },
  {
    tmdb_id: 46648,
    title: "True Detective",
    media_type: "tv",
    poster_path: "/cuV2O53rOT2wbImA48hvWwL28vK.jpg",
    release_date: "2014-01-12",
    overview:
      "An American anthology police procedural drama series where police investigations unearth the personal and professional secrets of those involved, both within and outside the law.",
    genre_ids: [18, 9648],
    tmdb_rating: 8.9,
  },
  {
    tmdb_id: 100088,
    title: "The Last of Us",
    media_type: "tv",
    poster_path: "/uKvVjHNqB5VmOrdxqAt2V7J9wwP.jpg",
    release_date: "2023-01-15",
    overview:
      "Twenty years after modern civilization has been destroyed, Joel, a hardened survivor, is hired to smuggle Ellie, a 14-year-old girl, out of an oppressive quarantine zone.",
    genre_ids: [18, 10765],
    tmdb_rating: 8.6,
  },
  {
    tmdb_id: 87108,
    title: "Chernobyl",
    media_type: "tv",
    poster_path: "/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg",
    release_date: "2019-05-06",
    overview:
      "The true story of one of the worst man-made catastrophes in history: the catastrophic nuclear accident at Chernobyl, and the sacrifices made to save Europe from unimaginable disaster.",
    genre_ids: [18, 36],
    tmdb_rating: 9.3,
  },
  {
    tmdb_id: 696506,
    title: "Mickey 17",
    media_type: "movie",
    poster_path: "/edKpE9B5qN3e559OuMCLZdW1iBZ.jpg",
    release_date: "2026-11-13",
    next_air_date: "2026-11-13",
    next_episode_label: "THEATRICAL RELEASE",
    overview:
      "Mickey 17 is an 'expendable'—a disposable employee on a human expedition sent to colonize the ice world Niflheim. Whenever one iteration dies, a new body is regenerated with most of his memories intact.",
    genre_ids: [878],
    tmdb_rating: 7.9,
  },
  {
    tmdb_id: 426063,
    title: "Nosferatu",
    media_type: "movie",
    poster_path: "/5qGIxdEO841C0tdY8vOdLoRVrr0.jpg",
    release_date: "2026-11-20",
    next_air_date: "2026-11-20",
    next_episode_label: "THEATRICAL RELEASE",
    overview:
      "A gothic tale of obsession between a haunted young woman in 19th-century Germany and the ancient Transylvanian vampire who stalks her, bringing untold horror with him across the bleak European landscape.",
    genre_ids: [27],
    tmdb_rating: 8.1,
  },
  {
    tmdb_id: 693134,
    title: "Dune: Part Two",
    media_type: "movie",
    poster_path: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    release_date: "2024-02-27",
    overview:
      "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe.",
    genre_ids: [878, 28],
    tmdb_rating: 8.5,
  },
  {
    tmdb_id: 335984,
    title: "Blade Runner 2049",
    media_type: "movie",
    poster_path: "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    release_date: "2017-10-04",
    overview:
      "Thirty years after the events of the first film, a new blade runner, LAPD Officer K, unearths a long-buried secret that has the potential to plunge what's left of society into chaos. K's discovery leads him on a quest to find Rick Deckard.",
    genre_ids: [878, 18],
    tmdb_rating: 8.1,
  },
  {
    tmdb_id: 872585,
    title: "Oppenheimer",
    media_type: "movie",
    poster_path: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    release_date: "2023-07-19",
    overview:
      "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    genre_ids: [18, 36],
    tmdb_rating: 8.8,
  },
  {
    tmdb_id: 414906,
    title: "The Batman",
    media_type: "movie",
    poster_path: "/74xTEgt7R36Fpooo50r9T25onhq.jpg",
    release_date: "2022-03-01",
    overview:
      "In his second year of fighting crime, Batman uncovers corruption in Gotham City that connects to his own family while facing a serial killer known as the Riddler.",
    genre_ids: [28, 80],
    tmdb_rating: 7.7,
  },
  {
    tmdb_id: 545611,
    title: "Everything Everywhere All at Once",
    media_type: "movie",
    poster_path: "/w3LxiVYPqRLexP07ApLcTUyeqZa.jpg",
    release_date: "2022-03-24",
    overview:
      "An aging Chinese immigrant is swept up in an insane adventure, where she alone can save what's important to her by connecting with the lives she could have led in other universes.",
    genre_ids: [28, 878, 35],
    tmdb_rating: 8.0,
  },
  {
    tmdb_id: 945961,
    title: "Alien: Romulus",
    media_type: "movie",
    poster_path: "/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg",
    release_date: "2024-08-13",
    overview:
      "While scavenging the deep ends of a derelict space station, a group of young space colonizers come face to face with the most terrifying life form in the universe.",
    genre_ids: [27, 878],
    tmdb_rating: 7.3,
  },
  {
    tmdb_id: 496243,
    title: "Parasite",
    media_type: "movie",
    poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    release_date: "2019-05-30",
    overview:
      "All unemployed, Ki-taek's family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.",
    genre_ids: [35, 18],
    tmdb_rating: 8.5,
  },
  {
    tmdb_id: 157336,
    title: "Interstellar",
    media_type: "movie",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    release_date: "2014-11-05",
    overview:
      "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
    genre_ids: [878, 18],
    tmdb_rating: 8.4,
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
  {
    tmdb_id: 872585,
    status: "watched",
    rating: 8,
    updated_at: "2026-10-24T19:00:00.000Z",
  },
  {
    tmdb_id: 157336,
    status: "watched",
    rating: 9,
    updated_at: "2026-10-20T21:00:00.000Z",
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

