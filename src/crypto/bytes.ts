// Byte helpers. Hex/UTF-8/concat come from @noble so we have one implementation
// everywhere instead of a local one.

import {
  bytesToHex,
  concatBytes,
  hexToBytes,
  utf8ToBytes,
} from '@noble/hashes/utils.js';
import { base64 } from '@scure/base';

export { bytesToHex, concatBytes, hexToBytes, utf8ToBytes };

export const bytesToBase64 = base64.encode;
export const base64ToBytes = base64.decode;

const decoder = new TextDecoder();

export function bytesToUtf8(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

// Compare without bailing out early, to avoid timing leaks.
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

// Overwrite a buffer. JS can't promise every copy is gone, but this shortens the
// time secrets sit around in memory.
export function zeroize(bytes: Uint8Array): void {
  bytes.fill(0);
}
