export type MediaType = "movie" | "tv";

export type MediaStatus = "want_to_watch" | "watching" | "watched";

export interface MediaRecord {
  tmdb_id: number;
  title: string;
  media_type: MediaType;
  poster_path: string | null;
  release_date?: string | null;
  next_air_date?: string | null;
  next_episode_label?: string | null;
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
  release_date?: string | null;
  next_air_date?: string | null;
  next_episode_label?: string | null;
  status: MediaStatus | null;
  rating: number | null;
  updated_at?: string | null;
  seasons?: SeasonWireframeGroup[];
}

