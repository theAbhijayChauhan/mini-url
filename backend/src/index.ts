import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings, ShortenRequest, AnalyticsSummary, UrlRecord } from './types';
import { generateRandomSlug, validateCustomSlug, RESERVED_SLUGS } from './lib/base62';
import { validateUrl, parseUserAgent, hashIp, sanitizeInput } from './lib/validator';
import { checkRateLimit } from './lib/ratelimit';
import { getSupabaseAdmin, getAuthUser } from './lib/supabase';

const app = new Hono<{ Bindings: Bindings }>();

// -----------------------------------------------------------------------------
// Global Cybersecurity Headers Middleware
// -----------------------------------------------------------------------------
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
});

// Enable CORS for frontend requests
app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: (origin) => {
      // Allow localhost, cloudflare pages, and configured frontend URL
      if (!origin) return '*';
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin;
      if (c.env.FRONTEND_URL && origin === c.env.FRONTEND_URL) return origin;
      if (origin.endsWith('.pages.dev')) return origin;
      return origin;
    },
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });
  return corsMiddleware(c, next);
});

// -----------------------------------------------------------------------------
// 1. Health Check
// -----------------------------------------------------------------------------
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'Mini URL API', timestamp: new Date().toISOString() });
});

// -----------------------------------------------------------------------------
// 2. Shorten URL Endpoint: POST /api/shorten
// -----------------------------------------------------------------------------
app.post('/api/shorten', async (c) => {
  try {
    const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
    
    // Rate Limiting (20 creations per minute per IP)
    const rateCheck = await checkRateLimit(clientIp, 20, 60, c.env.URL_CACHE);
    if (!rateCheck.allowed) {
      return c.json(
        { error: `Rate limit exceeded. Please wait ${rateCheck.resetInSeconds} seconds.` },
        429
      );
    }

    const body = await c.req.json<ShortenRequest>().catch(() => null);
    if (!body || !body.url) {
      return c.json({ error: 'A valid "url" field is required in JSON body.' }, 400);
    }

    const host = new URL(c.req.url).host;
    const validation = validateUrl(body.url, host);
    if (!validation.isValid || !validation.normalizedUrl) {
      return c.json({ error: validation.error || 'Invalid URL provided.' }, 400);
    }

    const targetUrl = validation.normalizedUrl;
    const supabase = getSupabaseAdmin(c.env);
    const authUser = await getAuthUser(c.req.header('Authorization'), c.env);

    let finalSlug = '';
    let isCustom = false;

    if (body.customSlug && body.customSlug.trim().length > 0) {
      const customValidation = validateCustomSlug(body.customSlug);
      if (!customValidation.isValid) {
        return c.json({ error: customValidation.error }, 400);
      }

      finalSlug = body.customSlug.trim();
      isCustom = true;

      // Check if custom slug is already taken
      const { data: existing } = await supabase
        .from('urls')
        .select('id')
        .eq('short_code', finalSlug)
        .maybeSingle();

      if (existing) {
        return c.json({ error: `The custom alias "${finalSlug}" is already taken.` }, 409);
      }
    } else {
      // Auto-generate random Base62 slug with collision retry
      let attempts = 0;
      let uniqueFound = false;

      while (attempts < 5 && !uniqueFound) {
        const candidate = generateRandomSlug(6);
        if (RESERVED_SLUGS.has(candidate.toLowerCase())) {
          attempts++;
          continue;
        }

        const { data: existing } = await supabase
          .from('urls')
          .select('id')
          .eq('short_code', candidate)
          .maybeSingle();

        if (!existing) {
          finalSlug = candidate;
          uniqueFound = true;
          break;
        }
        attempts++;
      }

      if (!uniqueFound) {
        // Fallback to 7 characters if 6-char had collisions
        finalSlug = generateRandomSlug(7);
      }
    }

    // Expiration date calculation (Default to 5 days for ephemeral chat links)
    let expiresAt: string | null = null;
    const daysToLive = body.expiresInDays !== undefined ? body.expiresInDays : 5;

    if (daysToLive > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + Math.min(daysToLive, 365));
      expiresAt = expDate.toISOString();
    } // If daysToLive <= 0, expiresAt remains null (Permanent link for logged-in users)

    // Insert record into Supabase
    const { data: inserted, error: insertError } = await supabase
      .from('urls')
      .insert({
        short_code: finalSlug,
        original_url: targetUrl,
        title: sanitizeInput(body.title),
        user_id: authUser ? authUser.id : null,
        custom_alias: isCustom,
        expires_at: expiresAt,
      })
      .select()
      .single();

    // Background auto-cleanup: delete expired links to permanently preserve database storage
    c.executionCtx.waitUntil(
      (async () => {
        try {
          await supabase
            .from('urls')
            .delete()
            .not('expires_at', 'is', null)
            .lt('expires_at', new Date().toISOString());
        } catch {}
      })()
    );

    if (insertError || !inserted) {
      console.error('Database insert error:', insertError);
      return c.json({ error: 'Failed to create short URL. Please try again.' }, 500);
    }

    // Populate KV cache if available
    if (c.env.URL_CACHE) {
      c.executionCtx.waitUntil(
        c.env.URL_CACHE.put(`url:${finalSlug}`, targetUrl, {
          expirationTtl: 86400 * 7, // 7 days cache
        })
      );
    }

    const shortUrl = `${new URL(c.req.url).origin}/${finalSlug}`;

    return c.json(
      {
        success: true,
        shortCode: finalSlug,
        shortUrl,
        originalUrl: targetUrl,
        title: inserted.title,
        createdAt: inserted.created_at,
        expiresAt: inserted.expires_at,
      },
      201
    );
  } catch (err: any) {
    console.error('Shorten error:', err);
    return c.json({ error: err.message || 'Internal server error.' }, 500);
  }
});

// -----------------------------------------------------------------------------
// 3. Get User's URLs: GET /api/urls (Requires Authentication)
// -----------------------------------------------------------------------------
app.get('/api/urls', async (c) => {
  try {
    const authUser = await getAuthUser(c.req.header('Authorization'), c.env);
    if (!authUser) {
      return c.json({ error: 'Unauthorized. Sign in to view your links.' }, 401);
    }

    const supabase = getSupabaseAdmin(c.env);
    const { data, error } = await supabase
      .from('urls')
      .select('*')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      return c.json({ error: 'Failed to fetch user URLs.' }, 500);
    }

    const origin = new URL(c.req.url).origin;
    const formatted = (data as UrlRecord[]).map((u) => ({
      ...u,
      shortUrl: `${origin}/${u.short_code}`,
    }));

    return c.json({ success: true, urls: formatted });
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error.' }, 500);
  }
});

// -----------------------------------------------------------------------------
// 4. Delete URL: DELETE /api/urls/:code (Requires Authentication)
// -----------------------------------------------------------------------------
app.delete('/api/urls/:code', async (c) => {
  try {
    const code = c.req.param('code');
    const authUser = await getAuthUser(c.req.header('Authorization'), c.env);
    if (!authUser) {
      return c.json({ error: 'Unauthorized.' }, 401);
    }

    const supabase = getSupabaseAdmin(c.env);

    // Verify ownership
    const { data: urlRecord } = await supabase
      .from('urls')
      .select('id, user_id')
      .eq('short_code', code)
      .maybeSingle();

    if (!urlRecord || urlRecord.user_id !== authUser.id) {
      return c.json({ error: 'URL not found or unauthorized to delete.' }, 404);
    }

    const { error: deleteError } = await supabase
      .from('urls')
      .delete()
      .eq('id', urlRecord.id);

    if (deleteError) {
      return c.json({ error: 'Failed to delete URL.' }, 500);
    }

    // Invalidate KV cache if available
    if (c.env.URL_CACHE) {
      c.executionCtx.waitUntil(c.env.URL_CACHE.delete(`url:${code}`));
    }

    return c.json({ success: true, message: 'URL deleted successfully.' });
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error.' }, 500);
  }
});

// -----------------------------------------------------------------------------
// 5. Analytics Endpoint: GET /api/analytics/:code
// -----------------------------------------------------------------------------
app.get('/api/analytics/:code', async (c) => {
  try {
    const code = c.req.param('code');
    const supabase = getSupabaseAdmin(c.env);

    // Get URL info
    const { data: urlRecord, error: urlError } = await supabase
      .from('urls')
      .select('id, short_code, original_url, title, clicks_count, created_at')
      .eq('short_code', code)
      .maybeSingle();

    if (urlError || !urlRecord) {
      return c.json({ error: 'Short URL not found.' }, 404);
    }

    // Get detailed clicks (last 500 clicks)
    const { data: clicks, error: clicksError } = await supabase
      .from('clicks')
      .select('clicked_at, country, device, browser, referrer')
      .eq('url_id', urlRecord.id)
      .order('clicked_at', { ascending: false })
      .limit(500);

    if (clicksError) {
      return c.json({ error: 'Failed to fetch analytics.' }, 500);
    }

    // Aggregations:
    const dateMap = new Map<string, number>();
    const countryMap = new Map<string, number>();
    const referrerMap = new Map<string, number>();
    const deviceMap = new Map<string, number>();

    (clicks || []).forEach((click) => {
      // Date (YYYY-MM-DD)
      const dateStr = new Date(click.clicked_at).toISOString().split('T')[0];
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);

      // Country
      const country = click.country || 'Unknown';
      countryMap.set(country, (countryMap.get(country) || 0) + 1);

      // Referrer
      let ref = click.referrer || 'Direct';
      try {
        if (ref !== 'Direct') ref = new URL(ref).hostname;
      } catch {}
      referrerMap.set(ref, (referrerMap.get(ref) || 0) + 1);

      // Device
      const dev = click.device || 'Desktop';
      deviceMap.set(dev, (deviceMap.get(dev) || 0) + 1);
    });

    const summary: AnalyticsSummary = {
      totalClicks: urlRecord.clicks_count || (clicks || []).length,
      url: {
        shortCode: urlRecord.short_code,
        originalUrl: urlRecord.original_url,
        createdAt: urlRecord.created_at,
        title: urlRecord.title,
      },
      clicksByDate: Array.from(dateMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topCountries: Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      topReferrers: Array.from(referrerMap.entries())
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      devices: Array.from(deviceMap.entries())
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count),
    };

    return c.json({ success: true, analytics: summary });
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error.' }, 500);
  }
});

// -----------------------------------------------------------------------------
// 6. High-Performance Redirect Route: GET /:code
// -----------------------------------------------------------------------------
app.get('/:code', async (c) => {
  const code = c.req.param('code');

  // Skip reserved routes or empty slugs
  if (!code || RESERVED_SLUGS.has(code.toLowerCase())) {
    return c.text('Not Found', 404);
  }

  let originalUrl: string | null = null;
  let urlId: number | null = null;

  // Step 1: Check Cloudflare KV Edge Cache if bound
  if (c.env.URL_CACHE) {
    try {
      const cached = await c.env.URL_CACHE.get(`url:${code}`);
      if (cached) {
        originalUrl = cached;
      }
    } catch {}
  }

  const supabase = getSupabaseAdmin(c.env);

  // Step 2: Query Supabase if not in KV or need url_id for analytics
  if (!originalUrl || !urlId) {
    const { data, error } = await supabase
      .from('urls')
      .select('id, original_url, is_active, expires_at')
      .eq('short_code', code)
      .maybeSingle();

    if (error || !data || !data.is_active) {
      return c.html(
        `<!DOCTYPE html>
        <html>
          <head><title>Link Not Found - Mini URL</title><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
          <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; text-align: center;">
            <div style="padding: 2rem; max-width: 480px;">
              <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem; color: #38bdf8;">404</h1>
              <h2 style="font-size: 1.25rem; font-weight: 500; margin-bottom: 1rem;">Mini URL Not Found</h2>
              <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.5;">The shortened link you tried to visit does not exist or has expired.</p>
            </div>
          </body>
        </html>`,
        404
      );
    }

    // Check expiration
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return c.text('This short link has expired.', 410);
    }

    originalUrl = data.original_url;
    urlId = data.id;

    // Populate KV cache for subsequent requests
    if (c.env.URL_CACHE && originalUrl) {
      c.executionCtx.waitUntil(
        c.env.URL_CACHE.put(`url:${code}`, originalUrl, { expirationTtl: 86400 * 7 })
      );
    }
  }

  if (!originalUrl) {
    return c.text('Not Found', 404);
  }

  // Step 3: Asynchronously log click analytics without blocking the redirect
  const rawCf = (c.req.raw as any).cf;
  const userAgent = c.req.header('user-agent');
  const referrer = c.req.header('referer') || 'Direct';
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';

  const { browser, os, device } = parseUserAgent(userAgent);
  const country = rawCf?.country || 'Unknown';
  const city = rawCf?.city || 'Unknown';

  if (urlId) {
    c.executionCtx.waitUntil(
      (async () => {
        try {
          const ipHashed = await hashIp(clientIp);
          await supabase.from('clicks').insert({
            url_id: urlId,
            country,
            city,
            device,
            browser,
            os,
            referrer,
            ip_hash: ipHashed,
          });
        } catch (logErr) {
          console.error('Async analytics logging error:', logErr);
        }
      })()
    );
  }

  // Step 4: HTTP 307 Temporary Redirect (preserves analytics tracking)
  return c.redirect(originalUrl, 307);
});

export default app;
