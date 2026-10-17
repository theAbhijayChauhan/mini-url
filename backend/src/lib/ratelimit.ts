/**
 * Sliding Window In-Memory / Edge Rate Limiter
 * Limits requests per client identifier (IP or user ID).
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory fallback per isolate
const ipStore = new Map<string, RateLimitRecord>();

export async function checkRateLimit(
  identifier: string,
  limit = 20,
  windowSeconds = 60,
  kv?: KVNamespace
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  const now = Math.floor(Date.now() / 1000);
  const key = `ratelimit:${identifier}`;

  if (kv) {
    try {
      const data = await kv.get<RateLimitRecord>(key, 'json');
      if (!data || data.resetAt < now) {
        await kv.put(
          key,
          JSON.stringify({ count: 1, resetAt: now + windowSeconds }),
          { expirationTtl: windowSeconds }
        );
        return { allowed: true, remaining: limit - 1, resetInSeconds: windowSeconds };
      }

      if (data.count >= limit) {
        return { allowed: false, remaining: 0, resetInSeconds: data.resetAt - now };
      }

      const updated = { count: data.count + 1, resetAt: data.resetAt };
      await kv.put(key, JSON.stringify(updated), {
        expirationTtl: Math.max(data.resetAt - now, 10),
      });

      return { allowed: true, remaining: limit - updated.count, resetInSeconds: data.resetAt - now };
    } catch {
      // Fallback to memory on KV error
    }
  }

  // Fallback: In-memory store
  const record = ipStore.get(identifier);
  if (!record || record.resetAt < now) {
    ipStore.set(identifier, { count: 1, resetAt: now + windowSeconds });
    return { allowed: true, remaining: limit - 1, resetInSeconds: windowSeconds };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetInSeconds: record.resetAt - now };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count, resetInSeconds: record.resetAt - now };
}
