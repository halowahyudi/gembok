import { bytesToBase64, timingSafeEqual, zeroize } from '@/crypto/bytes';
import { packSealed, unpackSealed } from '@/crypto/cipher';
import { CIPHER_VERSION } from '@/crypto/constants';
import { getCryptoCore } from '@/crypto/core';
import { DEFAULT_KDF_PARAMS, type KdfParams } from '@/crypto/kdf';
import {
  decodeSecretKey,
  deriveSecretKeyVerifier,
  encodeSecretKey,
  generateSecretKey,
} from '@/crypto/keys';
import { randomBytes } from '@/crypto/random';
import { generateRecoveryPhrase } from '@/crypto/recovery';
import { byteaToBytes, bytesToBytea } from '@/db/codec';
import { newId } from '@/lib/id';
import { normalizeEmail } from '@/lib/validation';

import { getSupabase } from './supabase';

export type CreateAccountResult = {
  userId: string;
  email: string;
  vaultId: string;
  /** Base32 form, shown once in the Emergency Kit. */
  secretKey: string;
  /** 24 words, shown once in the Emergency Kit. */
  recoveryMnemonic: string;
};

export type UnlockResult = {
  userId: string;
  email: string;
  vaultId: string;
  /** True once the account has a recovery verifier (new accounts). */
  recoveryEnabled: boolean;
};

type LoginHints = {
  kdf_salt: string;
  kdf_params: KdfParams | null;
  secret_key_verifier: string | null;
};

const SALT_LENGTH = 32;

// Full signup. The crypto core derives the keys and keeps userKey in its own
// memory; we only receive and store the non-secret artifacts.
export async function createAccount(input: {
  email: string;
  password: string;
}): Promise<CreateAccountResult> {
  const email = normalizeEmail(input.email);
  const salt = randomBytes(SALT_LENGTH);
  const secretKey = generateSecretKey();
  const recovery = generateRecoveryPhrase();
  const vaultId = newId();

  const core = getCryptoCore();
  const artifacts = await core.createAccount({
    password: input.password,
    secretKey,
    salt,
    params: DEFAULT_KDF_PARAMS,
    recoveryEntropy: recovery.entropy,
  });
  const recoveryAuthHash = await core.deriveRecoveryAuthHash(recovery.entropy);

  // Pull out what we need, then wipe the raw secrets.
  let authPassword = bytesToBase64(artifacts.authSecret);
  zeroize(artifacts.authSecret);
  const encodedSecretKey = encodeSecretKey(secretKey);
  zeroize(secretKey);

  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: authPassword,
    });
    if (error) throw error;

    const userId = data.user?.id;
    if (!userId) throw new Error('SIGNUP_FAILED');
    if (!data.session) throw new Error('EMAIL_CONFIRMATION_REQUIRED');

    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: userId,
      kdf_salt: bytesToBytea(salt),
      kdf_params: DEFAULT_KDF_PARAMS,
      protected_user_key: bytesToBytea(packSealed(artifacts.protectedUserKey)),
      protected_user_key_recovery: bytesToBytea(packSealed(artifacts.protectedUserKeyRecovery)),
      secret_key_verifier: bytesToBytea(artifacts.secretKeyVerifier),
      recovery_auth_hash: bytesToBytea(recoveryAuthHash),
      cipher_version: CIPHER_VERSION,
    });
    if (profileError) throw profileError;

    const { error: vaultError } = await supabase
      .from('vaults')
      .insert({ id: vaultId, owner_id: userId, cipher_version: CIPHER_VERSION });
    if (vaultError) {
      // A UUID collision is astronomically unlikely, but we surface it cleanly.
      if (vaultError.message?.includes('duplicate key')) {
        throw new Error('VAULT_ID_COLLISION');
      }
      throw vaultError;
    }

    return {
      userId,
      email,
      vaultId,
      secretKey: encodedSecretKey,
      recoveryMnemonic: recovery.mnemonic,
    };
  } finally {
    // Best-effort cleanup of the auth credential string and recovery verifier.
    authPassword = '';
    zeroize(recoveryAuthHash);
  }
}

// Login. Cheap checks first (email, secret key), then derive, sign in, and open
// the vault into the crypto core.
export async function unlockAccount(input: {
  email: string;
  password: string;
  secretKey: string;
}): Promise<UnlockResult> {
  const email = normalizeEmail(input.email);

  let secretKey: Uint8Array;
  try {
    secretKey = decodeSecretKey(input.secretKey);
  } catch {
    throw new Error('INVALID_SECRET_KEY');
  }

  const supabase = getSupabase();
  const { data: hintsData, error: hintsError } = await supabase.rpc('get_login_hints', {
    p_email: email,
  });
  if (hintsError) throw hintsError;

  const hinted = Array.isArray(hintsData) ? hintsData[0] : hintsData;
  const hints = hinted as LoginHints | undefined;
  if (!hints) throw new Error('EMAIL_NOT_FOUND');

  if (hints.secret_key_verifier) {
    const expected = byteaToBytes(hints.secret_key_verifier);
    const actual = deriveSecretKeyVerifier(secretKey);
    if (!timingSafeEqual(expected, actual)) {
      throw new Error('INVALID_SECRET_KEY');
    }
  }

  const salt = byteaToBytes(hints.kdf_salt);
  const params = hints.kdf_params ?? DEFAULT_KDF_PARAMS;
  const core = getCryptoCore();

  const authSecret = await core.deriveAuthSecret({
    password: input.password,
    secretKey,
    salt,
    params,
  });
  const authPassword = bytesToBase64(authSecret);
  zeroize(authSecret);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: authPassword,
  });
  if (error) {
    const message = (error.message ?? '').toLowerCase();
    if (message.includes('invalid login credentials')) {
      throw new Error('INVALID_PASSWORD');
    }
    throw error;
  }

  const userId = data.user?.id;
  if (!userId) throw new Error('SIGNIN_FAILED');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('protected_user_key, recovery_auth_hash')
    .eq('user_id', userId)
    .single();
  if (profileError) throw profileError;

  await core.openVault({
    password: input.password,
    secretKey,
    salt,
    params,
    protectedUserKey: unpackSealed(byteaToBytes(profile.protected_user_key as string)),
  });
  zeroize(secretKey);

  const { data: vault, error: vaultError } = await supabase
    .from('vaults')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .single();
  if (vaultError) throw vaultError;

  return {
    userId,
    email,
    vaultId: vault.id as string,
    recoveryEnabled: Boolean(profile.recovery_auth_hash),
  };
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
}

// Change the master password without re-encrypting items. The user may keep the
// current Secret Key or opt for a fresh one. The crypto core re-wraps the existing
// userKey; we only update the auth password and the protected key wrapper on the
// server.
export async function changePassword(input: {
  currentPassword: string;
  secretKey: string;
  newPassword: string;
  newSecretKey?: boolean;
}): Promise<{ secretKey: string }> {
  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('SIGNIN_FAILED');

  let secretKey: Uint8Array;
  try {
    secretKey = decodeSecretKey(input.secretKey);
  } catch {
    throw new Error('INVALID_SECRET_KEY');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('kdf_salt, kdf_params, protected_user_key')
    .eq('user_id', userId)
    .single();
  if (profileError) throw profileError;

  const salt = byteaToBytes(profile.kdf_salt as string);
  const params = (profile.kdf_params as KdfParams | null) ?? DEFAULT_KDF_PARAMS;
  const core = getCryptoCore();

  // Open the vault with the current password to prove ownership and load userKey.
  await core.openVault({
    password: input.currentPassword,
    secretKey,
    salt,
    params,
    protectedUserKey: unpackSealed(byteaToBytes(profile.protected_user_key as string)),
  });
  zeroize(secretKey);

  const useNewSecretKey = input.newSecretKey ?? false;
  const nextSecretKey = useNewSecretKey ? generateSecretKey() : decodeSecretKey(input.secretKey);
  const encodedNextSecretKey = useNewSecretKey
    ? encodeSecretKey(nextSecretKey)
    : input.secretKey;

  try {
    const { authSecret, protectedUserKey } = await core.rewrapCurrentKey({
      password: input.newPassword,
      secretKey: nextSecretKey,
      salt,
      params,
    });
    zeroize(nextSecretKey);

    const authPassword = bytesToBase64(authSecret);
    zeroize(authSecret);

    const nextSecretKeyBytes = decodeSecretKey(encodedNextSecretKey);
    const nextSecretKeyVerifier = deriveSecretKeyVerifier(nextSecretKeyBytes);
    zeroize(nextSecretKeyBytes);

    const { error: authError } = await supabase.auth.updateUser({
      password: authPassword,
    });
    if (authError) throw authError;

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        protected_user_key: bytesToBytea(packSealed(protectedUserKey)),
        secret_key_verifier: bytesToBytea(nextSecretKeyVerifier),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    if (profileUpdateError) throw profileUpdateError;

    return { secretKey: encodedNextSecretKey };
  } finally {
    zeroize(nextSecretKey);
  }
}
