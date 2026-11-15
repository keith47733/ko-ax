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
  rating_source?: "imdb" | "tmdb";
  number_of_seasons?: number;
  number_of_episodes?: number;
  series_status?: string;
  last_episode_to_air?: {
    season_number: number;
    episode_number: number;
    name?: string;
    air_date?: string | null;
  } | null;
  next_episode_to_air?: {
    season_number: number;
    episode_number: number;
    name?: string;
    air_date?: string | null;
  } | null;
}

export interface UserMediaRecord {
  id?: string;
  user_id?: string;
  tmdb_id: number;
  status: MediaStatus | null;
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
  rating_source?: "imdb" | "tmdb";
  number_of_seasons?: number;
  number_of_episodes?: number;
  series_status?: string;
  last_episode_to_air?: {
    season_number: number;
    episode_number: number;
    name?: string;
    air_date?: string | null;
  } | null;
  next_episode_to_air?: {
    season_number: number;
    episode_number: number;
    name?: string;
    air_date?: string | null;
  } | null;
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
  { key: "2020+", label: "2020+", startYear: 2020 },
  { key: "2010+", label: "2010+", startYear: 2010 },
  { key: "2000+", label: "2000+", startYear: 2000 },
  { key: "1990+", label: "1990+", startYear: 1990 },
  { key: "1980+", label: "1980+", startYear: 1980 },
  { key: "1970+", label: "1970+", startYear: 1970 },
  { key: "pre-1970", label: "PRE-1970", endYear: 1969 },
];

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

export type DisplayLayoutMode = "grid" | "list";

/**
 * Standardized responsive grid for MediaCards across all views (Tracker, Search, Discovery, Calendar).
 * Sized for a maximum of 4 cards across on desktop/ultrawide displays, ensuring large cinematic posters.
 */
export const MEDIA_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-5 sm:gap-6";

/**
 * Standardized list container for MediaListItem across all views.
 */
export const MEDIA_LIST_CLASS = "flex flex-col gap-2.5 sm:gap-3";

// ============================================================================
// TMDB API & RAW DATA SCHEMAS
// ============================================================================

export interface TmdbRawResult {
  id: number;
  title?: string;
  name?: string;
  media_type?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  genre_ids?: number[];
  vote_average?: number;
  popularity?: number;
  original_language?: string;
  adult?: boolean;
}

export interface RawTmdbRecommendation {
  tmdb_id: number;
  title: string;
  media_type: MediaType;
  poster_path: string | null;
  release_date: string | null;
  overview: string | null;
  genre_ids: number[];
  tmdb_rating: number | null;
  original_language?: string;
  adult?: boolean;
}

export interface DiscoveredFallbackItem {
  id: number;
  title: string;
  media_type: MediaType;
  poster_path: string | null;
  release_date: string | null;
  overview: string | null;
  genre_ids: number[];
  tmdb_rating: number | null;
}

export interface TmdbDetailPayload {
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  imdb_id?: string;
  external_ids?: {
    imdb_id?: string;
  };
  last_episode_to_air?: {
    season_number: number;
    episode_number: number;
    name?: string;
    air_date?: string | null;
  } | null;
  next_episode_to_air?: {
    season_number: number;
    episode_number: number;
    name?: string;
    air_date?: string | null;
  } | null;
}

export interface HomePageProps {
  searchParams: Promise<{ view?: string }>;
}

export interface DiscoverPageProps {
  searchParams: Promise<{
    seed?: string;
    type?: string;
    genre?: string;
    decade?: string;
  }>;
}

export interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export interface MediaDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ type?: string }>;
}

// ============================================================================
// COMPONENT PROPS & UI TYPES
// ============================================================================

export interface MediaCardProps {
  media: MergedMediaItem;
  onStateChange?: (updated: MergedMediaItem) => void;
}

export interface MediaDetailViewProps {
  initialMedia: MergedMediaItem;
  dataSource: "supabase" | "wireframe-store";
}

export interface MainViewingPaneProps {
  initialItems: MergedMediaItem[];
  activeView: LocalViewMode;
  dataSource?: "supabase" | "wireframe-store";
}

export interface DiscoveryViewProps {
  initialData: DiscoveryEngineResult;
  initialMediaType?: MediaType;
  seedId?: number;
  initialGenre?: string;
  initialDecade?: string;
}

export interface ReleaseCalendarProps {
  initialItems: MergedMediaItem[];
  dataSource?: "supabase" | "wireframe-store";
}

export interface SearchResultsPaneProps {
  query: string;
  initialItems: MergedMediaItem[];
}

export interface DateGroup {
  dateKey: string;
  formattedDate: string;
  relativeLabel: string;
  items: MergedMediaItem[];
}

export type TimeHorizon = "upcoming" | "next_30" | "next_90" | "all" | "past";

export interface NavItem {
  id: string;
  label: string;
  tooltip: string;
  href: string;
  viewParam: string;
  icon: (props: { className?: string }) => React.ReactElement;
}

export interface WireframeStore {
  media: Map<number, MediaRecord>;
  userMedia: Map<number, UserMediaRecord>;
  userEpisodes: Map<number, UserEpisodeRecord>;
  seasonsByMedia: Map<number, SeasonWireframeGroup[]>;
}

export interface AuthActionResult {
  success?: boolean;
  message?: string;
  error?: string;
  emailConfirmationRequired?: boolean;
  user?: {
    id: string;
    email?: string;
  } | null;
}

// ============================================================================
// FILTER & NAVIGATION COMPONENT INTERFACES
// ============================================================================

export interface FilterSidebarProps {
  children: React.ReactNode;
  className?: string;
}

export interface FilterSidebarHeaderProps {
  title: string;
  count?: number;
  countBadgeClass?: string;
}

export interface FilterSectionProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export interface SegmentedControlOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string | number> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: number;
  inline?: boolean;
  className?: string;
}

export interface FilterSearchInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

// ============================================================================
// STATUS & INTERACTIVE CONTROLS
// ============================================================================

export interface StatusOption {
  value: MediaStatus;
  shortLabel: string;
  fullLabel: string;
  accentBg: string;
  activeHoverBg: string;
  activeHoverClass: string;
  inactiveDarkHoverClass: string;
  textColor: string;
  activeRing: string;
  shadowColor: string;
  lightHoverBg: string;
  darkHoverBg: string;
  Icon: (props: { className?: string }) => React.ReactElement;
}

export interface StatusToggleGroupProps {
  status: MediaStatus | null;
  mediaType?: MediaType;
  onChange: (nextStatus: MediaStatus) => void;
  disabled?: boolean;
  className?: string;
  theme?: "light" | "dark";
  boxed?: boolean;
}

export interface StatusPopupButtonProps {
  status: MediaStatus | null;
  mediaType?: MediaType;
  onSelect: (nextStatus: MediaStatus) => void;
  disabled?: boolean;
  title?: string;
}

export interface StatusRatingControlProps {
  media: MergedMediaItem;
  onStateChange?: (updated: MergedMediaItem) => void;
  className?: string;
}

export interface SeasonTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: {
    tmdb_id: number;
    title: string;
    media_type: MediaType;
    poster_path: string | null;
    backdrop_path?: string | null;
    release_date?: string | null;
    next_air_date?: string | null;
    next_episode_label?: string | null;
    overview?: string | null;
    series_status?: string | null;
    tmdb_rating?: number | null;
    seasons?: SeasonWireframeGroup[];
  };
  initialStatus: MediaStatus | null;
  initialRating: number | null;
  onStateChange?: (updated: {
    status: MediaStatus | null;
    rating: number | null;
    seasons: SeasonWireframeGroup[];
  }) => void;
}

export type MainViewSortBy = "title" | "date" | "added" | "rating";

export interface SessionCookieOptions {
  path?: string;
  maxAge?: number;
  domain?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  httpOnly?: boolean;
}

export interface ViewModeToggleProps {
  viewMode: DisplayLayoutMode;
  onChange: (mode: DisplayLayoutMode) => void;
  className?: string;
}

export interface SearchBarProps {
  defaultValue?: string;
  value?: string;
  onChange?: (val: string) => void;
  onSubmit?: (val: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  id?: string;
}

// ============================================================================
// SUPABASE DATABASE SCHEMAS
// ============================================================================

export interface MediaTable {
  tmdb_id: number;
  title: string;
  media_type: MediaType;
  poster_path: string | null;
  release_date: string | null;
  next_air_date: string | null;
  next_episode_label: string | null;
  overview: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserMediaTable {
  id: string;
  user_id: string;
  tmdb_id: number;
  status: MediaStatus | null;
  rating: number | null;
  updated_at: string;
}

export interface UserEpisodesTable {
  id: string;
  user_id: string;
  tmdb_id: number;
  tmdb_episode_id: number;
  season_number: number;
  episode_number: number;
  watched_boolean: boolean;
  watch_date: string | null;
}
