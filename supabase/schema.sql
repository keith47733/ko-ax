-- ============================================================================
-- KO-AX SUPABASE DATABASE SCHEMA (Deliverable 1)
-- Minimalist Media Tracking Web App
-- ============================================================================

-- Enable UUID generation extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS
-- Handled natively by Supabase Auth (auth.users).
-- ============================================================================

-- ============================================================================
-- 2. MEDIA TABLE
-- Caches TMDB metadata locally so user_media and user_episodes can join
-- against cached titles and poster paths without redundant TMDB API calls.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.media (
  tmdb_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  poster_path TEXT,
  release_date DATE,
  next_air_date DATE,
  next_episode_label TEXT,
  overview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_media_type ON public.media (media_type);
CREATE INDEX IF NOT EXISTS idx_media_release_date ON public.media (release_date);

-- ============================================================================
-- 3. USER_MEDIA TABLE
-- Junction table linking authenticated Supabase users (auth.users) to media.
-- Tracks watch status ('want_to_watch', 'watching', 'watched') and rating (1-10).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL REFERENCES public.media(tmdb_id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('want_to_watch', 'watching', 'watched')),
  rating SMALLINT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10)),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tmdb_id)
);

CREATE INDEX IF NOT EXISTS idx_user_media_user_status ON public.user_media (user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_media_tmdb_id ON public.user_media (tmdb_id);

-- Automatically refresh updated_at on row modification
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_media_updated_at ON public.user_media;
CREATE TRIGGER trg_user_media_updated_at
BEFORE UPDATE ON public.user_media
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_media_updated_at ON public.media;
CREATE TRIGGER trg_media_updated_at
BEFORE UPDATE ON public.media
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 4. USER_EPISODES TABLE
-- Tracks individual TV episode watch states per user.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL REFERENCES public.media(tmdb_id) ON DELETE CASCADE,
  tmdb_episode_id INTEGER NOT NULL,
  season_number INTEGER NOT NULL DEFAULT 1,
  episode_number INTEGER NOT NULL DEFAULT 1,
  watched_boolean BOOLEAN NOT NULL DEFAULT FALSE,
  watch_date TIMESTAMPTZ,
  UNIQUE (user_id, tmdb_episode_id)
);

CREATE INDEX IF NOT EXISTS idx_user_episodes_user_media ON public.user_episodes (user_id, tmdb_id);
CREATE INDEX IF NOT EXISTS idx_user_episodes_episode_id ON public.user_episodes (tmdb_episode_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_episodes ENABLE ROW LEVEL SECURITY;

-- Media cache is readable by everyone and writable by authenticated users
DROP POLICY IF EXISTS "Media cache is viewable by all users" ON public.media;
CREATE POLICY "Media cache is viewable by all users"
  ON public.media FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert/update media cache" ON public.media;
CREATE POLICY "Authenticated users can insert/update media cache"
  ON public.media FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- user_media policies: users only read/write their own tracking rows
DROP POLICY IF EXISTS "Users can view their own user_media" ON public.user_media;
CREATE POLICY "Users can view their own user_media"
  ON public.user_media FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own user_media" ON public.user_media;
CREATE POLICY "Users can insert their own user_media"
  ON public.user_media FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own user_media" ON public.user_media;
CREATE POLICY "Users can update their own user_media"
  ON public.user_media FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own user_media" ON public.user_media;
CREATE POLICY "Users can delete their own user_media"
  ON public.user_media FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- user_episodes policies: users only read/write their own episode rows
DROP POLICY IF EXISTS "Users can view their own user_episodes" ON public.user_episodes;
CREATE POLICY "Users can view their own user_episodes"
  ON public.user_episodes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own user_episodes" ON public.user_episodes;
CREATE POLICY "Users can insert their own user_episodes"
  ON public.user_episodes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own user_episodes" ON public.user_episodes;
CREATE POLICY "Users can update their own user_episodes"
  ON public.user_episodes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own user_episodes" ON public.user_episodes;
CREATE POLICY "Users can delete their own user_episodes"
  ON public.user_episodes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

