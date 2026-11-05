export type MediaType = "movie" | "tv";

export type MediaStatus = "want_to_watch" | "watching" | "watched";

export type LocalViewMode = "library" | MediaStatus | "calendar";

export interface MediaRecord {
  tmdb_id: number;
  title: string;
  media_type: MediaType;
  poster_path: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  next_air_date?: string | null;
  next_episode_label?: string | null;
  overview?: string | null;
  genre_ids?: number[];
  tmdb_rating?: number | null;
}

export interface UserMediaRecord {
  id?: string;
  user_id?: string;
  tmdb_id: number;
  status: MediaStatus;
  rating: number | null;
  updated_at: string;
}

export interface UserEpisodeRecord {
  id?: string;
  user_id?: string;
  tmdb_id: number;
  tmdb_episode_id: number;
  season_number: number;
  episode_number: number;
  watched_boolean: boolean;
  watch_date: string | null;
}

export interface EpisodeWireframeItem {
  tmdb_episode_id: number;
  season_number: number;
  episode_number: number;
  title: string;
  air_date: string | null;
  watched_boolean: boolean;
  watch_date: string | null;
}

export interface SeasonWireframeGroup {
  season_number: number;
  name: string;
  episodes: EpisodeWireframeItem[];
}

export interface MergedMediaItem {
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
  updated_at?: string | null;
  seasons?: SeasonWireframeGroup[];
  genre_ids?: number[];
  tmdb_rating?: number | null;
}

export interface GenreDefinition {
  key: string;
  label: string;
  movieGenreId: number | null;
  tvGenreId: number | null;
}

export const DISCOVERY_GENRES: GenreDefinition[] = [
  { key: "all", label: "ALL GENRES", movieGenreId: null, tvGenreId: null },
  { key: "action", label: "ACTION", movieGenreId: 28, tvGenreId: 10759 },
  { key: "scifi", label: "SCI-FI", movieGenreId: 878, tvGenreId: 10765 },
  { key: "horror", label: "HORROR", movieGenreId: 27, tvGenreId: 10765 },
  { key: "comedy", label: "COMEDY", movieGenreId: 35, tvGenreId: 35 },
  { key: "drama", label: "DRAMA", movieGenreId: 18, tvGenreId: 18 },
  { key: "documentary", label: "DOCUMENTARY", movieGenreId: 99, tvGenreId: 99 },
];

export interface EraDefinition {
  key: string;
  label: string;
  startYear?: number;
  endYear?: number;
}

export const DISCOVERY_ERAS: EraDefinition[] = [
  { key: "all", label: "ALL TIME" },
  { key: "2020s", label: "2020s", startYear: 2020, endYear: 2029 },
  { key: "2010s", label: "2010s", startYear: 2010, endYear: 2019 },
  { key: "2000s", label: "2000s", startYear: 2000, endYear: 2009 },
  { key: "1990s", label: "1990s", startYear: 1990, endYear: 1999 },
  { key: "classic", label: "PRE-1990", startYear: 1900, endYear: 1989 },
];

export function getDecadeFromDate(dateStr?: string | null): string {
  if (!dateStr) return "2020s";
  const year = parseInt(dateStr.slice(0, 4), 10);
  if (isNaN(year)) return "2020s";
  if (year >= 2020) return "2020s";
  if (year >= 2010) return "2010s";
  if (year >= 2000) return "2000s";
  if (year >= 1990) return "1990s";
  return "classic";
}

export interface DiscoverySeedInfo {
  id: number;
  title: string;
  media_type: MediaType;
  isUrlSeed: boolean;
}

export interface DiscoveryEngineResult {
  mediaType: MediaType;
  suggestions: MergedMediaItem[];
  seed: DiscoverySeedInfo | null;
  noRatedMedia?: boolean;
  dataSource: "tmdb" | "wireframe-store" | "none";
}

/**
 * Standardized responsive grid for MediaCards across all views (Tracker, Search, Discovery, Calendar).
 * Sized for a maximum of 4 cards across on desktop/ultrawide displays, ensuring large cinematic posters.
 */
export const MEDIA_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-5 sm:gap-6";


