export interface UrlItem {
  id: number;
  short_code: string;
  original_url: string;
  shortUrl: string;
  title: string | null;
  clicks_count: number;
  created_at: string;
  expires_at: string | null;
  custom_alias: boolean;
}

export interface AnalyticsData {
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

export interface ShortenFormValues {
  url: string;
  customSlug?: string;
  title?: string;
  expiresInDays?: number;
}
