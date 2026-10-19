// Single place that reads env vars. Expo only inlines EXPO_PUBLIC_* values, and
// only when accessed literally (process.env.EXPO_PUBLIC_X), so don't switch to
// dynamic lookups. Never put a service_role or sb_secret key here; the check
// below exists to catch that mistake before it ships.

export type AppEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const rawAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

function decodeJwtRole(key: string): string | null {
  const parts = key.split('.');
  if (parts.length !== 3) return null;
  try {
    const payloadPart = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(payloadPart);
    const payload = JSON.parse(json) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

// A client key is fine as long as it's an anon/publishable key. This throws if
// someone pastes a service_role key into the app by accident.
export function assertClientSafeKey(key: string): void {
  if (!key) return;
  if (key.startsWith('sb_secret_')) {
    throw new Error('Supabase secret key detected. Do not use it in the client app.');
  }
  if (key.includes('service_role')) {
    throw new Error('SERVICE_ROLE key detected. Never ship it in the app.');
  }
  const role = decodeJwtRole(key);
  if (role === 'service_role') {
    throw new Error('SERVICE_ROLE key detected. Never ship it in the app.');
  }
}

assertClientSafeKey(rawAnonKey);

export const env: AppEnv = {
  supabaseUrl: rawUrl,
  supabaseAnonKey: rawAnonKey,
};

export function isSupabaseConfigured(): boolean {
  return env.supabaseUrl.length > 0 && env.supabaseAnonKey.length > 0;
}
