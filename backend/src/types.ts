export interface Bindings {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  FRONTEND_URL?: string;
  URL_CACHE?: KVNamespace;
}

export interface ShortenRequest {
  url: string;
  customSlug?: string;
  title?: string;
  expiresInDays?: number;
}

export interface UrlRecord {
  id: number;
  short_code: string;
  original_url: string;
  title: string | null;
  user_id: string | null;
  custom_alias: boolean;
  clicks_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClickRecord {
  id: number;
  url_id: number;
  clicked_at: string;
  country: string;
  city: string;
  device: string;
  browser: string;
  os: string;
  referrer: string;
  ip_hash: string | null;
}

export interface AnalyticsSummary {
  totalClicks: number;
  url: {
    shortCode: string;
    originalUrl: string;
    createdAt: string;
    title: string | null;
  };
  clicksByDate: { date: string; count: number }[];
  topCountries: { country: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  devices: { device: string; count: number }[];
}
