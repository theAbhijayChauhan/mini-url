-- ==============================================================================
-- MINI URL - SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- It creates tables, indexes, triggers, and Row Level Security (RLS) policies.
-- ==============================================================================

-- 1. Create 'urls' table
CREATE TABLE IF NOT EXISTS public.urls (
    id BIGSERIAL PRIMARY KEY,
    short_code VARCHAR(16) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    title VARCHAR(255) DEFAULT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    custom_alias BOOLEAN DEFAULT FALSE,
    clicks_count BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_urls_short_code ON public.urls(short_code);
CREATE INDEX IF NOT EXISTS idx_urls_user_id ON public.urls(user_id);
CREATE INDEX IF NOT EXISTS idx_urls_created_at ON public.urls(created_at DESC);

-- 2. Create 'clicks' analytics table
CREATE TABLE IF NOT EXISTS public.clicks (
    id BIGSERIAL PRIMARY KEY,
    url_id BIGINT NOT NULL REFERENCES public.urls(id) ON DELETE CASCADE,
    clicked_at TIMESTAMPTZ DEFAULT NOW(),
    country VARCHAR(64) DEFAULT 'Unknown',
    city VARCHAR(64) DEFAULT 'Unknown',
    device VARCHAR(32) DEFAULT 'Desktop',
    browser VARCHAR(32) DEFAULT 'Unknown',
    os VARCHAR(32) DEFAULT 'Unknown',
    referrer TEXT DEFAULT 'Direct',
    ip_hash VARCHAR(64) DEFAULT NULL
);

-- Indexes for analytics aggregation queries
CREATE INDEX IF NOT EXISTS idx_clicks_url_id ON public.clicks(url_id);
CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON public.clicks(clicked_at DESC);

-- 3. Trigger to keep 'clicks_count' in 'urls' automatically updated
CREATE OR REPLACE FUNCTION public.increment_url_clicks()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.urls
    SET clicks_count = clicks_count + 1,
        updated_at = NOW()
    WHERE id = NEW.url_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_increment_url_clicks ON public.clicks;
CREATE TRIGGER trigger_increment_url_clicks
AFTER INSERT ON public.clicks
FOR EACH ROW
EXECUTE FUNCTION public.increment_url_clicks();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security (RLS) Policies

-- URL Policies:
-- Anyone can look up active, unexpired URLs (needed for public redirects)
DROP POLICY IF EXISTS "Public can view active URLs" ON public.urls;
CREATE POLICY "Public can view active URLs" ON public.urls
    FOR SELECT
    USING (
        is_active = TRUE AND 
        (expires_at IS NULL OR expires_at > NOW())
    );

-- Any user (anonymous or authenticated) can insert a new shortened URL
DROP POLICY IF EXISTS "Anyone can insert URLs" ON public.urls;
CREATE POLICY "Anyone can insert URLs" ON public.urls
    FOR INSERT
    WITH CHECK (true);

-- Authenticated users can update their own links
DROP POLICY IF EXISTS "Users can update own URLs" ON public.urls;
CREATE POLICY "Users can update own URLs" ON public.urls
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Authenticated users can delete their own links
DROP POLICY IF EXISTS "Users can delete own URLs" ON public.urls;
CREATE POLICY "Users can delete own URLs" ON public.urls
    FOR DELETE
    USING (auth.uid() = user_id);

-- Click Analytics Policies:
-- Service role or backend worker handles inserts
DROP POLICY IF EXISTS "Backend worker can insert clicks" ON public.clicks;
CREATE POLICY "Backend worker can insert clicks" ON public.clicks
    FOR INSERT
    WITH CHECK (true);

-- Users can view clicks for their own links
DROP POLICY IF EXISTS "Users can view clicks of their URLs" ON public.clicks;
CREATE POLICY "Users can view clicks of their URLs" ON public.clicks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.urls
            WHERE public.urls.id = public.clicks.url_id
            AND public.urls.user_id = auth.uid()
        )
    );
