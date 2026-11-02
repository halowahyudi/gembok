import { bytesToBase64, bytesToHex, zeroize } from '@/crypto/bytes';
import { packSealed, unpackSealed } from '@/crypto/cipher';
import { getCryptoCore } from '@/crypto/core';
import { DEFAULT_KDF_PARAMS, type KdfParams } from '@/crypto/kdf';
import {
  deriveSecretKeyVerifier,
  encodeSecretKey,
  generateSecretKey,
} from '@/crypto/keys';
import { normalizeRecoveryMnemonic, recoveryPhraseToEntropy } from '@/crypto/recovery';
import { byteaToBytes, bytesToBytea } from '@/db/codec';
import { normalizeEmail } from '@/lib/validation';

import { getSupabase } from './supabase';

export type RecoverResult = {
  userId: string;
  email: string;
  vaultId: string;
  /** Fresh secret key; the old one is now invalid. */
  secretKey: string;
  /** The same 24-word phrase, still valid for future recovery. */
  recoveryMnemonic: string;
};

type RecoveryBlob = {
  kdf_salt: string;
  kdf_params: KdfParams | null;
  protected_user_key_recovery: string;
};

/**
 * Recover access with the 24-word phrase: the core unwraps userKey, then we
 * issue a new password and a new secret key and let the server rotate
 * credentials via the recovery edge function.
 */
export async function recoverAccount(input: {
  email: string;
  mnemonic: string;
  newPassword: string;
}): Promise<RecoverResult> {
  const email = normalizeEmail(input.email);
  const mnemonic = normalizeRecoveryMnemonic(input.mnemonic);

  const entropy = recoveryPhraseToEntropy(mnemonic);
  const core = getCryptoCore();
  const recoveryAuthHash = bytesToHex(await core.deriveRecoveryAuthHash(entropy));

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_recovery_blob', { p_email: email });
  if (error) {
    zeroize(entropy);
    throw error;
  }

  const blob = (Array.isArray(data) ? data[0] : data) as RecoveryBlob | undefined;
  if (!blob) {
    zeroize(entropy);
    throw new Error('ACCOUNT_NOT_FOUND');
  }

  const salt = byteaToBytes(blob.kdf_salt);
  const params = blob.kdf_params ?? DEFAULT_KDF_PARAMS;

  // Opens userKey in the core; a wrong phrase fails the AEAD tag here.
  try {
    await core.openVaultWithRecovery({
      recoveryEntropy: entropy,
      protectedUserKeyRecovery: unpackSealed(
        byteaToBytes(blob.protected_user_key_recovery),
      ),
    });
  } catch {
    zeroize(entropy);
    throw new Error('INVALID_RECOVERY');
  }
  zeroize(entropy);

  const newSecretKey = generateSecretKey();
  const encodedSecretKey = encodeSecretKey(newSecretKey);
  const secretKeyVerifier = deriveSecretKeyVerifier(newSecretKey);
  const newSecretKeyVerifier = bytesToBytea(secretKeyVerifier);
  zeroize(secretKeyVerifier);

  const { authSecret, protectedUserKey } = await core.rewrapCurrentKey({
    password: input.newPassword,
    secretKey: newSecretKey,
    salt,
    params,
  });
  zeroize(newSecretKey);

  const authPassword = bytesToBase64(authSecret);
  zeroize(authSecret);
  const newProtectedUserKey = bytesToBytea(packSealed(protectedUserKey));

  const { data: fnData, error: fnError } = await supabase.functions.invoke('recover-account', {
    body: {
      email,
      recoveryAuthHash,
      newAuthSecret: authPassword,
      newProtectedUserKey,
      newSecretKeyVerifier,
    },
  });
  if (fnError) {
    const context = (fnError as { context?: { json?: () => Promise<unknown> } }).context;
    if (context && typeof context.json === 'function') {
      const errBody = await context.json().catch(() => null);
      if (errBody && typeof errBody === 'object' && 'error' in errBody) {
        throw new Error(String((errBody as { error: unknown }).error));
      }
    }
    throw fnError;
  }
  if (fnData && typeof fnData === 'object' && 'error' in fnData) {
    throw new Error(String((fnData as { error: unknown }).error));
  }

  const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: authPassword,
  });
  if (signInError) throw signInError;

  const userId = signIn.user?.id;
  if (!userId) throw new Error('SIGNIN_FAILED');

  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({
      secret_key_verifier: newSecretKeyVerifier,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (profileUpdateError) throw profileUpdateError;

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
    secretKey: encodedSecretKey,
    recoveryMnemonic: mnemonic,
  };
}

/**
 * Legacy accounts have a wrapped recovery key but no verifier. Entering the
 * 24 words once proves ownership (the AEAD tag must open) and stores the
 * verifier so the account becomes recoverable.
 */
export async function enableRecovery(input: { mnemonic: string }): Promise<void> {
  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('SIGNIN_FAILED');

  const entropy = recoveryPhraseToEntropy(input.mnemonic);
  const core = getCryptoCore();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('protected_user_key_recovery')
    .eq('user_id', userId)
    .single();
  if (profileError) {
    zeroize(entropy);
    throw profileError;
  }

  try {
    await core.openVaultWithRecovery({
      recoveryEntropy: entropy,
      protectedUserKeyRecovery: unpackSealed(
        byteaToBytes(profile.protected_user_key_recovery as string),
      ),
    });
  } catch {
    zeroize(entropy);
    throw new Error('INVALID_RECOVERY');
  }
  const recoveryAuthHash = await core.deriveRecoveryAuthHash(entropy);
  zeroize(entropy);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      recovery_auth_hash: bytesToBytea(recoveryAuthHash),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (updateError) throw updateError;
}
