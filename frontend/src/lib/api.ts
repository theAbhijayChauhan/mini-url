import { ShortenFormValues, UrlItem, AnalyticsData } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

interface ShortenResponse {
  success: boolean;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  title: string | null;
  createdAt: string;
  expiresAt: string | null;
  error?: string;
}

export async function shortenUrl(
  values: ShortenFormValues,
  authToken?: string | null
): Promise<ShortenResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/shorten`, {
    method: 'POST',
    headers,
    body: JSON.stringify(values),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to shorten URL');
  }

  return data;
}

export async function fetchUserUrls(authToken: string): Promise<UrlItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/urls`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch your links');
  }

  return data.urls || [];
}

export async function deleteUrl(shortCode: string, authToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/urls/${shortCode}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete link');
  }
}

export async function fetchAnalytics(shortCode: string): Promise<AnalyticsData> {
  const response = await fetch(`${API_BASE_URL}/api/analytics/${shortCode}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch analytics');
  }

  return data.analytics;
}
