import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { base32nopad } from '@scure/base';

import { AAD, HKDF_INFO, KEY_LENGTH, SECRET_KEY_LENGTH } from './constants';
import { concatBytes, utf8ToBytes, zeroize } from './bytes';
import { open, seal, type Sealed } from './cipher';
import { randomBytes } from './random';
import type { Kdf, KdfParams } from './kdf';

function deriveKey(
  ikm: Uint8Array,
  salt: Uint8Array | undefined,
  info: string,
  length = KEY_LENGTH,
): Uint8Array {
  return hkdf(sha256, ikm, salt, utf8ToBytes(info), length);
}

// masterKey = HKDF(argon2(password) || secretKey). Both halves are required:
// knowing only the password (or only the secret key) gets you nowhere.
export function deriveMasterKey(
  derived: Uint8Array,
  secretKey: Uint8Array,
  salt: Uint8Array,
): Uint8Array {
  return deriveKey(concatBytes(derived, secretKey), salt, HKDF_INFO.master);
}

// This is what we hand to Supabase Auth as the "password". It can't decrypt the
// vault, it only proves the user knows the password + secret key.
export function deriveAuthSecret(masterKey: Uint8Array, salt: Uint8Array): Uint8Array {
  return deriveKey(masterKey, salt, HKDF_INFO.auth);
}

// Wraps userKey. Changes whenever the password changes.
export function deriveEncMasterKey(
  masterKey: Uint8Array,
  salt: Uint8Array,
): Uint8Array {
  return deriveKey(masterKey, salt, HKDF_INFO.enc);
}

// Wraps userKey for the recovery flow.
export function deriveRecoveryEncKey(recoveryEntropy: Uint8Array): Uint8Array {
  return deriveKey(recoveryEntropy, undefined, HKDF_INFO.recovery);
}

// A check value for the recovery phrase, stored on the server so the recovery
// endpoint can verify the caller. Safe: the phrase carries 256-bit entropy.
export function deriveRecoveryAuthHash(recoveryEntropy: Uint8Array): Uint8Array {
  return deriveKey(recoveryEntropy, undefined, HKDF_INFO.recoveryAuth);
}

// A check value for the secret key, stored on the server. Lets login reject a
// wrong secret key before running Argon2. Safe to store: the key itself is
// 128-bit random, so this can't be reversed or brute forced.
export function deriveSecretKeyVerifier(secretKey: Uint8Array): Uint8Array {
  return deriveKey(secretKey, undefined, HKDF_INFO.secretKeyVerifier);
}

export type AccountKeys = {
  masterKey: Uint8Array;
  authSecret: Uint8Array;
  encMasterKey: Uint8Array;
};

// The derivation both signup and login go through, so they can't drift apart.
export async function deriveAccountKeys(args: {
  kdf: Kdf;
  password: string;
  salt: Uint8Array;
  secretKey: Uint8Array;
  params: KdfParams;
  onProgress?: (fraction: number) => void;
}): Promise<AccountKeys> {
  const derived = await args.kdf.derive(
    args.password,
    args.salt,
    args.params,
    args.onProgress,
  );
  const masterKey = deriveMasterKey(derived, args.secretKey, args.salt);
  const authSecret = deriveAuthSecret(masterKey, args.salt);
  const encMasterKey = deriveEncMasterKey(masterKey, args.salt);
  // Drop the raw Argon2 output now that the subkeys exist.
  zeroize(derived);
  return {
    masterKey,
    authSecret,
    encMasterKey,
  };
}

// Random 256-bit key, the one that actually encrypts items.
export function generateUserKey(): Uint8Array {
  return randomBytes(KEY_LENGTH);
}

// Random 128-bit secret shown in the Emergency Kit.
export function generateSecretKey(): Uint8Array {
  return randomBytes(SECRET_KEY_LENGTH);
}

export function encodeSecretKey(secretKey: Uint8Array): string {
  return base32nopad.encode(secretKey);
}

export function decodeSecretKey(encoded: string): Uint8Array {
  // The UI shows groups separated by dashes, so strip anything that isn't base32.
  const bytes = base32nopad.decode(encoded.replace(/[^A-Za-z2-7]/g, '').toUpperCase());
  if (bytes.length !== SECRET_KEY_LENGTH) {
    throw new Error('INVALID_SECRET_KEY_LENGTH');
  }
  return bytes;
}

// Wrap/unwrap userKey with encMasterKey. A wrong password fails here.
export function wrapUserKey(userKey: Uint8Array, encMasterKey: Uint8Array): Sealed {
  return seal(encMasterKey, userKey, AAD.userKey);
}

export function unwrapUserKey(sealed: Sealed, encMasterKey: Uint8Array): Uint8Array {
  return open(encMasterKey, sealed.iv, sealed.ciphertext, AAD.userKey);
}

// Same idea, but keyed by the recovery phrase.
export function wrapUserKeyForRecovery(
  userKey: Uint8Array,
  recoveryEncKey: Uint8Array,
): Sealed {
  return seal(recoveryEncKey, userKey, AAD.userKeyRecovery);
}

export function unwrapUserKeyFromRecovery(
  sealed: Sealed,
  recoveryEncKey: Uint8Array,
): Uint8Array {
  return open(recoveryEncKey, sealed.iv, sealed.ciphertext, AAD.userKeyRecovery);
}
