import { ShortenFormValues, UrlItem, AnalyticsData } from '../types';

const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

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

async function parseResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const text = await response.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          `API endpoint not found (404). Check that your VITE_API_URL (${API_BASE_URL}) points to your Cloudflare Worker and not the Pages frontend.`
        );
      }
      throw new Error(`Server returned status ${response.status}: ${text.slice(0, 120) || 'Unknown response'}`);
    }
    throw new Error('Received unexpected non-JSON response from server.');
  }

  if (!response.ok) {
    throw new Error(data?.error || fallbackError);
  }

  return data as T;
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

  return parseResponse<ShortenResponse>(response, 'Failed to shorten URL');
}

export async function fetchUserUrls(authToken: string): Promise<UrlItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/urls`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  const data = await parseResponse<{ success: boolean; urls: UrlItem[] }>(
    response,
    'Failed to fetch your links'
  );

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
    const text = await response.text().catch(() => '');
    let errMsg = 'Failed to delete link';
    try {
      const parsed = JSON.parse(text);
      if (parsed.error) errMsg = parsed.error;
    } catch {
      if (text) errMsg = `Server returned ${response.status}: ${text}`;
    }
    throw new Error(errMsg);
  }
}

export async function fetchAnalytics(shortCode: string): Promise<AnalyticsData> {
  const response = await fetch(`${API_BASE_URL}/api/analytics/${shortCode}`);
  const data = await parseResponse<{ success: boolean; analytics: AnalyticsData }>(
    response,
    'Failed to fetch analytics'
  );

  return data.analytics;
}

