import { bytesToBase64, bytesToHex, zeroize } from '@/crypto/bytes';
import { packSealed, unpackSealed } from '@/crypto/cipher';
import { getCryptoCore } from '@/crypto/core';
import { DEFAULT_KDF_PARAMS, type KdfParams } from '@/crypto/kdf';
import { encodeSecretKey, generateSecretKey } from '@/crypto/keys';
import { recoveryPhraseToEntropy } from '@/crypto/recovery';
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
  const mnemonic = input.mnemonic.trim().replace(/\s+/g, ' ');

  const entropy = recoveryPhraseToEntropy(mnemonic);
  const core = getCryptoCore();
  const recoveryAuthHash = bytesToHex(await core.deriveRecoveryAuthHash(entropy));

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_recovery_blob', { p_email: email });
  if (error) throw error;

  const blob = (Array.isArray(data) ? data[0] : data) as RecoveryBlob | undefined;
  if (!blob) throw new Error('ACCOUNT_NOT_FOUND');

  const salt = byteaToBytes(blob.kdf_salt);
  const params = blob.kdf_params ?? DEFAULT_KDF_PARAMS;

  // Opens userKey in the core; a wrong phrase fails the AEAD tag here.
  await core.openVaultWithRecovery({
    recoveryEntropy: entropy,
    protectedUserKeyRecovery: unpackSealed(
      byteaToBytes(blob.protected_user_key_recovery),
    ),
  });
  zeroize(entropy);

  const newSecretKey = generateSecretKey();
  const encodedSecretKey = encodeSecretKey(newSecretKey);
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
    body: { email, recoveryAuthHash, newAuthSecret: authPassword, newProtectedUserKey },
  });
  if (fnError) throw fnError;
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
  if (profileError) throw profileError;

  await core.openVaultWithRecovery({
    recoveryEntropy: entropy,
    protectedUserKeyRecovery: unpackSealed(
      byteaToBytes(profile.protected_user_key_recovery as string),
    ),
  });
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
