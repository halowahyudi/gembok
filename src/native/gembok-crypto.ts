import { createNativeKdf, registerNativeKdf, type NativeArgon2Fn } from '@/crypto/kdf';

type NativeModule = {
  deriveArgon2id(
    password: string,
    saltHex: string,
    t: number,
    m: number,
    p: number,
    dkLen: number,
  ): Promise<string>;
};

let nativeModule: NativeModule | null = null;

function loadNative(): NativeModule | null {
  if (nativeModule) return nativeModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../modules/gembok-crypto') as
      | { default?: NativeModule }
      | NativeModule;
    nativeModule = (mod as { default?: NativeModule }).default ?? (mod as NativeModule);
  } catch {
    nativeModule = null;
  }
  return nativeModule;
}

export function isNativeCryptoAvailable(): boolean {
  return loadNative() !== null;
}

/**
 * Register the native Argon2id as the active KDF when the module is present.
 * Falls back to the JS KDF otherwise (Expo Go, tests, Node).
 */
export function registerNativeCrypto(): boolean {
  const mod = loadNative();
  if (!mod?.deriveArgon2id) return false;

  const fn: NativeArgon2Fn = async (password, saltHex, config) => {
    const rawHash = await mod.deriveArgon2id(
      password,
      saltHex,
      config.iterations,
      config.memory,
      config.parallelism,
      config.hashLength,
    );
    return { rawHash };
  };

  registerNativeKdf(createNativeKdf(fn));
  return true;
}
