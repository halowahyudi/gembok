import { gcm } from '@noble/ciphers/aes.js';

import { NONCE_LENGTH } from './constants';
import { concatBytes, utf8ToBytes } from './bytes';
import { randomBytes } from './random';

export type Sealed = {
  iv: Uint8Array;
  ciphertext: Uint8Array;
};

function assertKey(key: Uint8Array): void {
  if (key.length !== 32) {
    throw new Error('AES-256-GCM requires a 32-byte key.');
  }
}

function aadBytes(aad?: Uint8Array | string): Uint8Array | undefined {
  if (aad === undefined) return undefined;
  return typeof aad === 'string' ? utf8ToBytes(aad) : aad;
}

// AES-256-GCM. Fresh 96-bit nonce per call; reusing one with the same key would
// be catastrophic. The tag is appended to the ciphertext (same as WebCrypto).
export function seal(
  key: Uint8Array,
  plaintext: Uint8Array,
  aad?: Uint8Array | string,
): Sealed {
  assertKey(key);
  const iv = randomBytes(NONCE_LENGTH);
  const ciphertext = gcm(key, iv, aadBytes(aad)).encrypt(plaintext);
  return { iv, ciphertext };
}

// Throws if the tag or AAD doesn't match.
export function open(
  key: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  aad?: Uint8Array | string,
): Uint8Array {
  assertKey(key);
  if (iv.length !== NONCE_LENGTH) {
    throw new Error(`AES-256-GCM nonce must be ${NONCE_LENGTH} bytes.`);
  }
  return gcm(key, iv, aadBytes(aad)).decrypt(ciphertext);
}

// Store a Sealed value as a single blob: iv first, then ciphertext.
export function packSealed(sealed: Sealed): Uint8Array {
  return concatBytes(sealed.iv, sealed.ciphertext);
}

export function unpackSealed(packed: Uint8Array): Sealed {
  if (packed.length < NONCE_LENGTH + 16) {
    throw new Error('Packed sealed value is too short.');
  }
  return {
    iv: packed.subarray(0, NONCE_LENGTH),
    ciphertext: packed.subarray(NONCE_LENGTH),
  };
}
