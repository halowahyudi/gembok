// Recovery endpoint. The only place with service_role: it verifies the recovery
// phrase via a stored hash, then rotates the auth password and the wrapped
// userKey. Deploy with --no-verify-jwt; the caller is unauthenticated by design.
//
// Body: { email, recoveryAuthHash, newAuthSecret, newProtectedUserKey, newSecretKeyVerifier }
//   recoveryAuthHash     hex string (from the 24-word phrase)
//   newAuthSecret        base64 derived auth secret (becomes the auth password)
//   newProtectedUserKey  bytea hex string ("\x...")
//   newSecretKeyVerifier bytea hex string ("\x...") (optional for backwards compatibility)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function byteaHex(value: string | null): string {
  if (!value) return '';
  return (value.startsWith('\\x') ? value.slice(2) : value).toLowerCase();
}

// Constant-time compare of two hex strings.
function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email : '';
    const recoveryAuthHash =
      typeof body?.recoveryAuthHash === 'string' ? body.recoveryAuthHash.toLowerCase() : '';
    const newAuthSecret = typeof body?.newAuthSecret === 'string' ? body.newAuthSecret : '';
    const newProtectedUserKey =
      typeof body?.newProtectedUserKey === 'string' ? body.newProtectedUserKey : '';
    const newSecretKeyVerifier =
      typeof body?.newSecretKeyVerifier === 'string' ? body.newSecretKeyVerifier : null;

    if (!email || !recoveryAuthHash || !newAuthSecret || !newProtectedUserKey) {
      return json({ error: 'MISSING_FIELDS' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: userId, error: findError } = await admin.rpc('find_user_id_by_email', {
      p_email: email,
    });
    if (findError) throw findError;
    if (!userId) return json({ error: 'ACCOUNT_NOT_FOUND' }, 404);

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('recovery_auth_hash')
      .eq('user_id', userId)
      .single();
    if (profileError) throw profileError;

    const storedHex = byteaHex(profile?.recovery_auth_hash as string | null);
    if (!safeEqualHex(storedHex, recoveryAuthHash)) {
      return json({ error: 'INVALID_RECOVERY' }, 401);
    }

    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      password: newAuthSecret,
    });
    if (authError) throw authError;

    const profileUpdates: Record<string, unknown> = {
      protected_user_key: newProtectedUserKey,
      updated_at: new Date().toISOString(),
    };
    if (newSecretKeyVerifier) {
      profileUpdates.secret_key_verifier = newSecretKeyVerifier;
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update(profileUpdates)
      .eq('user_id', userId);
    if (updateError) throw updateError;

    return json({ ok: true });
  } catch (error) {
    return json({ error: 'SERVER_ERROR', message: String((error as Error)?.message ?? error) }, 500);
  }
});
