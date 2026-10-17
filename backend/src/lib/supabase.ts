import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Bindings } from '../types';

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

/**
 * Returns a Supabase client configured with the service_role secret key for backend actions.
 */
export function getSupabaseAdmin(env: Bindings): SupabaseClient {
  if (
    cachedClient &&
    lastUrl === env.SUPABASE_URL &&
    lastKey === env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return cachedClient;
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  }

  cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  lastUrl = env.SUPABASE_URL;
  lastKey = env.SUPABASE_SERVICE_ROLE_KEY;

  return cachedClient;
}

/**
 * Extracts the user object from an Authorization Bearer token header if present.
 */
export async function getAuthUser(authHeader: string | undefined, env: Bindings) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) return null;

  try {
    const supabase = getSupabaseAdmin(env);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}
