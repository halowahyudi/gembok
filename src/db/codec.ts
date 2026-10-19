// PostgREST sends bytea as a hex string with a \x prefix. Convert to/from
// Uint8Array so the rest of the app only deals in bytes.
import { bytesToHex, hexToBytes } from '@/crypto/bytes';

const BYTEA_PREFIX = '\\x';

export function bytesToBytea(bytes: Uint8Array): string {
  return BYTEA_PREFIX + bytesToHex(bytes);
}

export function byteaToBytes(value: string): Uint8Array {
  const hex = value.startsWith(BYTEA_PREFIX) ? value.slice(BYTEA_PREFIX.length) : value;
  return hexToBytes(hex);
}
