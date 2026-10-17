/**
 * Advanced Cybersecurity Validator & Anti-Malware / SSRF Shield
 */

// Hostnames prohibited to prevent internal network scanning and recursion
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS/GCP/Azure instance metadata service IP
]);

// Block direct executable and dangerous malware extensions from being shortened
const DANGEROUS_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.scr',
  '.vbs',
  '.msi',
  '.dll',
  '.ps1',
  '.com',
  '.pif',
  '.reg',
  '.hta',
  '.jar',
  '.vbe',
  '.wsf',
]);

/**
 * Sanitizes text to prevent Cross-Site Scripting (XSS) in custom titles and metadata.
 */
export function sanitizeInput(str: string | null | undefined): string | null {
  if (!str) return null;
  return str
    .replace(/[<>'"&]/g, (char) => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        case '&': return '&amp;';
        default: return char;
      }
    })
    .trim()
    .slice(0, 150);
}

/**
 * Validates a user-provided URL against protocol, syntax, malware, and SSRF criteria.
 */
export function validateUrl(
  inputUrl: string,
  selfHost?: string
): { isValid: boolean; normalizedUrl?: string; error?: string } {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { isValid: false, error: 'URL must not be empty.' };
  }

  let trimmed = inputUrl.trim();

  // Enforce standard URL length limit (prevents DoS via oversized URLs)
  if (trimmed.length > 2048) {
    return { isValid: false, error: 'URL exceeds maximum allowable length of 2,048 characters.' };
  }

  // Prepend https:// if protocol is omitted
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);

    // 1. Strict Protocol check: Disallow dangerous schemes (javascript:, data:, file:, etc.)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'Prohibited protocol. Only http:// and https:// URLs are allowed.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // 2. Anti-Malware check: Block direct download of malicious executables
    const pathname = parsed.pathname.toLowerCase();
    for (const ext of DANGEROUS_EXTENSIONS) {
      if (pathname.endsWith(ext) || pathname.includes(`${ext}/`)) {
        return {
          isValid: false,
          error: `Security Alert: Shortening direct executable files (${ext}) is blocked to protect against malware.`,
        };
      }
    }

    // 3. Loopback & Metadata Protection (SSRF defense)
    if (BLOCKED_HOSTNAMES.has(hostname)) {
      return { isValid: false, error: 'Access Denied: Shortening loopback or metadata addresses is blocked.' };
    }

    // 4. Obfuscated Decimal/Hex/Octal IP detection (e.g. http://2130706433 or 0x7f.1)
    if (/^0x[0-9a-f]+$/i.test(hostname) || /^\d+$/.test(hostname)) {
      return { isValid: false, error: 'Access Denied: Obfuscated numerical IP hostnames are prohibited.' };
    }

    // 5. Private RFC 1918 Subnets
    if (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return { isValid: false, error: 'Access Denied: Shortening internal/private network addresses is blocked.' };
    }

    // 6. Anti-Recursion: Prevent self-pointing loops
    if (selfHost && (hostname === selfHost.toLowerCase() || hostname.endsWith(`.${selfHost.toLowerCase()}`))) {
      return { isValid: false, error: 'Cannot shorten links that loop back to this service.' };
    }

    return { isValid: true, normalizedUrl: parsed.toString() };
  } catch {
    return { isValid: false, error: 'Invalid URL format. Please provide a valid web address.' };
  }
}

/**
 * Parses user-agent header into clean browser and OS labels
 */
export function parseUserAgent(userAgent?: string | null): { browser: string; os: string; device: string } {
  if (!userAgent) return { browser: 'Unknown', os: 'Unknown', device: 'Desktop' };

  let device = 'Desktop';
  if (/mobile|android|touch/i.test(userAgent)) device = 'Mobile';
  else if (/tablet|ipad/i.test(userAgent)) device = 'Tablet';

  let os = 'Unknown';
  if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
  else if (/linux/i.test(userAgent)) os = 'Linux';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';

  let browser = 'Unknown';
  if (/edg\//i.test(userAgent)) browser = 'Edge';
  else if (/chrome\//i.test(userAgent)) browser = 'Chrome';
  else if (/safari\//i.test(userAgent) && !/chrome\//i.test(userAgent)) browser = 'Safari';
  else if (/firefox\//i.test(userAgent)) browser = 'Firefox';
  else if (/opera|opr\//i.test(userAgent)) browser = 'Opera';

  return { browser, os, device };
}

/**
 * Anonymizes client IP to a one-way SHA-256 hash for GDPR/privacy compliance.
 */
export async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + '_salt_mini_url_cybersecurity');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}
