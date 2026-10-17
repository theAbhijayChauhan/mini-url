const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = BASE62_CHARS.length; // 62

// Reserved slugs that cannot be used as short codes
export const RESERVED_SLUGS = new Set([
  'api',
  'admin',
  'analytics',
  'auth',
  'dashboard',
  'login',
  'register',
  'signup',
  'logout',
  'settings',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'health',
  'status',
]);

/**
 * Encodes a numeric ID into a Base62 string.
 */
export function encodeBase62(num: bigint | number): string {
  let n = typeof num === 'bigint' ? num : BigInt(num);
  if (n === 0n) return BASE62_CHARS[0];

  let result = '';
  const baseBig = BigInt(BASE);

  while (n > 0n) {
    const remainder = Number(n % baseBig);
    result = BASE62_CHARS[remainder] + result;
    n = n / baseBig;
  }

  return result;
}

/**
 * Decodes a Base62 string back into a bigint.
 */
export function decodeBase62(str: string): bigint {
  let result = 0n;
  const baseBig = BigInt(BASE);

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const index = BASE62_CHARS.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base62 character: ${char}`);
    }
    result = result * baseBig + BigInt(index);
  }

  return result;
}

/**
 * Generates a cryptographically strong pseudo-random Base62 string of given length.
 * Default is 6 characters (62^6 = ~56.8 Billion permutations).
 */
export function generateRandomSlug(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let slug = '';
  for (let i = 0; i < length; i++) {
    slug += BASE62_CHARS[bytes[i] % BASE];
  }
  return slug;
}

/**
 * Validates whether a custom alias is legal.
 * Rules: 3 to 30 chars, alphanumeric + hyphens/underscores, not a reserved system keyword.
 */
export function validateCustomSlug(slug: string): { isValid: boolean; error?: string } {
  const trimmed = slug.trim();
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Custom alias must be at least 3 characters long.' };
  }
  if (trimmed.length > 30) {
    return { isValid: false, error: 'Custom alias cannot exceed 30 characters.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { isValid: false, error: 'Custom alias can only contain letters, numbers, hyphens (-), and underscores (_).' };
  }
  if (RESERVED_SLUGS.has(trimmed.toLowerCase())) {
    return { isValid: false, error: `The alias "${trimmed}" is a reserved system keyword.` };
  }
  return { isValid: true };
}
