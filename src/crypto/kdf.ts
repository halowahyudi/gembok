import { argon2idAsync } from '@noble/hashes/argon2.js';

import { bytesToHex, hexToBytes, utf8ToBytes } from './bytes';

// Argon2id cost settings. We persist these per account (profiles.kdf_params) so
// they can be raised later without breaking old logins.
export type KdfParams = {
  algo: 'argon2id';
  /** Memory cost, in kibibytes. */
  m: number;
  /** Iterations. */
  t: number;
  /** Parallelism. */
  p: number;
  /** Output length, in bytes. */
  dkLen: number;
  /** Argon2 version. 0x13 is v19. */
  version: number;
};

// Release settings: 64 MiB, 3 passes, 1 lane.
export const DEFAULT_KDF_PARAMS: KdfParams = {
  algo: 'argon2id',
  m: 65536,
  t: 3,
  p: 1,
  dkLen: 32,
  version: 0x13,
};

// Fast settings for tests only. Don't use these for real accounts.
export const TEST_KDF_PARAMS: KdfParams = {
  algo: 'argon2id',
  m: 1024,
  t: 1,
  p: 1,
  dkLen: 32,
  version: 0x13,
};

export interface Kdf {
  readonly id: string;
  derive(
    password: string,
    salt: Uint8Array,
    params: KdfParams,
    onProgress?: (fraction: number) => void,
  ): Promise<Uint8Array>;
}

// Argon2id in pure JS. Works in Node for tests, and as the on-device fallback
// until the native module exists. We use the async variant so it yields to the
// event loop; otherwise the UI freezes (and Android may kill us with an ANR).
export const jsKdf: Kdf = {
  id: 'js-argon2id',
  async derive(password, salt, params, onProgress) {
    return argon2idAsync(utf8ToBytes(password), salt, {
      t: params.t,
      m: params.m,
      p: params.p,
      dkLen: params.dkLen,
      version: params.version,
      asyncTick: 25,
      onProgress,
    });
  },
};

// Shape of the native module we'll wrap later (same call style as
// react-native-argon2).
export type NativeArgon2Config = {
  iterations: number;
  memory: number;
  parallelism: number;
  hashLength: number;
  mode: 'argon2d' | 'argon2i' | 'argon2id';
  saltEncoding: 'hex';
};

export type NativeArgon2Result = {
  rawHash: string;
  encodedHash?: string;
};

export type NativeArgon2Fn = (
  password: string,
  salt: string,
  config: NativeArgon2Config,
) => Promise<NativeArgon2Result>;

// Wrap a native Argon2id call into the Kdf interface. The native module gets
// registered at startup, so this file stays free of platform imports.
export function createNativeKdf(argon2: NativeArgon2Fn): Kdf {
  return {
    id: 'native-argon2id',
    async derive(password, salt, params) {
      const result = await argon2(password, bytesToHex(salt), {
        iterations: params.t,
        memory: params.m,
        parallelism: params.p,
        hashLength: params.dkLen,
        mode: 'argon2id',
        saltEncoding: 'hex',
      });
      return hexToBytes(result.rawHash);
    },
  };
}

let activeKdf: Kdf = jsKdf;

// Swap in the native KDF once it's available.
export function registerNativeKdf(kdf: Kdf): void {
  activeKdf = kdf;
}

export function selectKdf(): Kdf {
  return activeKdf;
}
