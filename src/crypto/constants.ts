// Shared sizes and context strings. Every HKDF call and every AEAD wrap uses a
// unique label, so a key for one purpose can't be reused for another.

export const KEY_LENGTH = 32;
export const SECRET_KEY_LENGTH = 16;
export const NONCE_LENGTH = 12;
export const CIPHER_VERSION = 1;

// HKDF "info" values.
export const HKDF_INFO = {
  master: 'gembok/v1/master',
  auth: 'gembok/v1/auth',
  enc: 'gembok/v1/enc',
  recovery: 'gembok/v1/recovery',
  recoveryAuth: 'gembok/v1/recovery-auth',
  secretKeyVerifier: 'gembok/v1/secret-key-verifier',
} as const;

// AAD values, binding ciphertext to what it belongs to.
export const AAD = {
  userKey: 'gembok/v1/user-key',
  userKeyRecovery: 'gembok/v1/user-key-recovery',
  deviceUserKey: 'gembok/v1/device-user-key',
  item: 'gembok/v1/item',
} as const;
