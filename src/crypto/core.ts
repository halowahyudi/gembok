import { bytesToHex, hexToBytes, zeroize } from './bytes';
import { open, packSealed, seal, unpackSealed, type Sealed } from './cipher';
import type { KdfParams } from './kdf';
import { selectKdf } from './kdf';
import {
  deriveAccountKeys,
  deriveRecoveryAuthHash,
  deriveRecoveryEncKey,
  deriveSecretKeyVerifier,
  generateUserKey,
  unwrapUserKey,
  unwrapUserKeyFromRecovery,
  wrapUserKey,
  wrapUserKeyForRecovery,
} from './keys';

export type CreateAccountArtifacts = {
  authSecret: Uint8Array;
  protectedUserKey: Sealed;
  protectedUserKeyRecovery: Sealed;
  secretKeyVerifier: Uint8Array;
};

export type DeriveAuthSecretInput = {
  password: string;
  secretKey: Uint8Array;
  salt: Uint8Array;
  params: KdfParams;
};

export type OpenVaultInput = DeriveAuthSecretInput & {
  protectedUserKey: Sealed;
};

/**
 * Session-based crypto boundary. The implementation owns the vault key, so it
 * never has to cross into JS. `jsCryptoCore` keeps it in a module variable;
 * `nativeCryptoCore` keeps it in native memory.
 */
export interface CryptoCore {
  readonly id: 'js' | 'native';
  isUnlocked(): boolean;
  lock(): void;

  createAccount(input: DeriveAuthSecretInput & {
    recoveryEntropy: Uint8Array;
  }): Promise<CreateAccountArtifacts>;
  deriveAuthSecret(input: DeriveAuthSecretInput): Promise<Uint8Array>;
  openVault(input: OpenVaultInput): Promise<void>;
  openVaultWithRecovery(input: {
    recoveryEntropy: Uint8Array;
    protectedUserKeyRecovery: Sealed;
  }): Promise<void>;
  deriveRecoveryAuthHash(recoveryEntropy: Uint8Array): Promise<Uint8Array>;

  /** Re-wrap the current session key with a new password/secret key. */
  rewrapCurrentKey(
    input: DeriveAuthSecretInput,
  ): Promise<{ authSecret: Uint8Array; protectedUserKey: Sealed }>;

  sealItem(aad: string, plaintext: Uint8Array): Promise<Sealed>;
  openItem(aad: string, sealed: Sealed): Promise<Uint8Array>;

  /** Wrap the session key for biometric unlock; returns an opaque blob. */
  enrollDevice(): Promise<string>;
  unlockDevice(wrapped: string): Promise<void>;
  clearDevice(): Promise<void>;
}

// ---------------------------------------------------------------------------
// JS core: reference implementation, Node tests, and Expo Go fallback.
// ---------------------------------------------------------------------------

let jsUserKey: Uint8Array | null = null;

export const jsCryptoCore: CryptoCore = {
  id: 'js',
  isUnlocked: () => jsUserKey !== null,
  lock: () => {
    if (jsUserKey) zeroize(jsUserKey);
    jsUserKey = null;
  },

  async createAccount({ password, secretKey, salt, params, recoveryEntropy }) {
    const { authSecret, encMasterKey } = await deriveAccountKeys({
      kdf: selectKdf(),
      password,
      salt,
      secretKey,
      params,
    });
    const recoveryEncKey = deriveRecoveryEncKey(recoveryEntropy);
    const key = generateUserKey();
    const protectedUserKey = wrapUserKey(key, encMasterKey);
    const protectedUserKeyRecovery = wrapUserKeyForRecovery(key, recoveryEncKey);
    const secretKeyVerifier = deriveSecretKeyVerifier(secretKey);
    jsUserKey = key;
    return { authSecret, protectedUserKey, protectedUserKeyRecovery, secretKeyVerifier };
  },

  async deriveAuthSecret({ password, secretKey, salt, params }) {
    const { authSecret } = await deriveAccountKeys({
      kdf: selectKdf(),
      password,
      salt,
      secretKey,
      params,
    });
    return authSecret;
  },

  async openVault({ password, secretKey, salt, params, protectedUserKey }) {
    const { encMasterKey } = await deriveAccountKeys({
      kdf: selectKdf(),
      password,
      salt,
      secretKey,
      params,
    });
    jsUserKey = unwrapUserKey(protectedUserKey, encMasterKey);
  },

  async openVaultWithRecovery({ recoveryEntropy, protectedUserKeyRecovery }) {
    jsUserKey = unwrapUserKeyFromRecovery(
      protectedUserKeyRecovery,
      deriveRecoveryEncKey(recoveryEntropy),
    );
  },

  async deriveRecoveryAuthHash(recoveryEntropy) {
    return deriveRecoveryAuthHash(recoveryEntropy);
  },

  async rewrapCurrentKey({ password, secretKey, salt, params }) {
    if (!jsUserKey) throw new Error('LOCKED');
    const { authSecret, encMasterKey } = await deriveAccountKeys({
      kdf: selectKdf(),
      password,
      salt,
      secretKey,
      params,
    });
    return { authSecret, protectedUserKey: wrapUserKey(jsUserKey, encMasterKey) };
  },

  async sealItem(aad, plaintext) {
    if (!jsUserKey) throw new Error('LOCKED');
    return seal(jsUserKey, plaintext, aad);
  },

  async openItem(aad, sealed) {
    if (!jsUserKey) throw new Error('LOCKED');
    return open(jsUserKey, sealed.iv, sealed.ciphertext, aad);
  },

  async enrollDevice() {
    if (!jsUserKey) throw new Error('LOCKED');
    const deviceKey = generateUserKey();
    const wrapped = packSealed(seal(deviceKey, jsUserKey, 'gembok/v1/device-user-key'));
    // The device key only needs to survive on this device; keep it in the
    // keystore-backed store next to the wrapped blob.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
    await SecureStore.setItemAsync('gembok.js-device-key', bytesToHex(deviceKey));
    zeroize(deviceKey);
    return bytesToHex(wrapped);
  },

  async unlockDevice(wrapped) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
    const keyHex = await SecureStore.getItemAsync('gembok.js-device-key');
    if (!keyHex) throw new Error('NO_DEVICE_KEY');
    const deviceKey = hexToBytes(keyHex);
    const sealed = unpackSealed(hexToBytes(wrapped));
    jsUserKey = open(deviceKey, sealed.iv, sealed.ciphertext, 'gembok/v1/device-user-key');
    zeroize(deviceKey);
  },

  async clearDevice() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
    await SecureStore.deleteItemAsync('gembok.js-device-key').catch(() => undefined);
  },
};

// ---------------------------------------------------------------------------
// Native core: keys live in native memory (modules/gembok-crypto).
// ---------------------------------------------------------------------------

type NativeModule = {
  isUnlocked(): boolean;
  lock(): void;
  createAccount(
    password: string,
    secretKeyHex: string,
    saltHex: string,
    t: number,
    m: number,
    p: number,
    recoveryEntropyHex: string,
  ): Promise<{
    authSecret: string;
    protectedUserKey: string;
    protectedUserKeyRecovery: string;
    secretKeyVerifier: string;
  }>;
  deriveAuthSecret(
    password: string,
    secretKeyHex: string,
    saltHex: string,
    t: number,
    m: number,
    p: number,
  ): Promise<string>;
  openVault(
    password: string,
    secretKeyHex: string,
    saltHex: string,
    t: number,
    m: number,
    p: number,
    protectedUserKeyHex: string,
  ): Promise<boolean>;
  openVaultWithRecovery(
    recoveryEntropyHex: string,
    protectedUserKeyRecoveryHex: string,
  ): Promise<boolean>;
  deriveRecoveryAuthHash(recoveryEntropyHex: string): Promise<string>;
  rewrapUserKey(
    password: string,
    secretKeyHex: string,
    saltHex: string,
    t: number,
    m: number,
    p: number,
  ): Promise<{ authSecret: string; protectedUserKey: string }>;
  sealItem(aad: string, plaintextHex: string): Promise<{ iv: string; ciphertext: string }>;
  openItem(aad: string, ivHex: string, ciphertextHex: string): Promise<string>;
  enrollDevice(): Promise<string>;
  unlockDevice(wrapped: string): Promise<boolean>;
  clearDevice(): Promise<void>;
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

const nativeCryptoCore: CryptoCore = {
  id: 'native',
  isUnlocked: () => loadNative()?.isUnlocked() ?? false,
  lock: () => loadNative()?.lock(),

  async createAccount({ password, secretKey, salt, params, recoveryEntropy }) {
    const mod = loadNative();
    if (!mod) throw new Error('NO_NATIVE');
    const r = await mod.createAccount(
      password,
      bytesToHex(secretKey),
      bytesToHex(salt),
      params.t,
      params.m,
      params.p,
      bytesToHex(recoveryEntropy),
    );
    return {
      authSecret: hexToBytes(r.authSecret),
      protectedUserKey: unpackSealed(hexToBytes(r.protectedUserKey)),
      protectedUserKeyRecovery: unpackSealed(hexToBytes(r.protectedUserKeyRecovery)),
      secretKeyVerifier: hexToBytes(r.secretKeyVerifier),
    };
  },

  async deriveAuthSecret({ password, secretKey, salt, params }) {
    const mod = loadNative();
    if (!mod) throw new Error('NO_NATIVE');
    return hexToBytes(
      await mod.deriveAuthSecret(
        password,
        bytesToHex(secretKey),
        bytesToHex(salt),
        params.t,
        params.m,
        params.p,
      ),
    );
  },

  async openVault({ password, secretKey, salt, params, protectedUserKey }) {
    const mod = loadNative();
    if (!mod) throw new Error('NO_NATIVE');
    await mod.openVault(
      password,
      bytesToHex(secretKey),
      bytesToHex(salt),
      params.t,
      params.m,
      params.p,
      bytesToHex(packSealed(protectedUserKey)),
    );
  },

  async openVaultWithRecovery({ recoveryEntropy, protectedUserKeyRecovery }) {
    const mod = loadNative();
    if (!mod) throw new Error('NO_NATIVE');
    await mod.openVaultWithRecovery(
      bytesToHex(recoveryEntropy),
      bytesToHex(packSealed(protectedUserKeyRecovery)),
    );
  },

  async deriveRecoveryAuthHash(recoveryEntropy) {
    const mod = loadNative();
    if (!mod) throw new Error('NO_NATIVE');
    return hexToBytes(await mod.deriveRecoveryAuthHash(bytesToHex(recoveryEntropy)));
  },

  async rewrapCurrentKey({ password, secretKey, salt, params }) {
    const mod = loadNative();
    if (!mod) throw new Error('NO_NATIVE');
    const r = await mod.rewrapUserKey(
      password,
      bytesToHex(secretKey),
      bytesToHex(salt),
      params.t,
      params.m,
      params.p,
    );
    return {
      authSecret: hexToBytes(r.authSecret),
      protectedUserKey: unpackSealed(hexToBytes(r.protectedUserKey)),
    };
  },

  async sealItem(aad, plaintext) {
    const mod = loadNative();
    if (!mod) throw new Error('NO_NATIVE');
    const r = await mod.sealItem(aad, bytesToHex(plaintext));
    return { iv: hexToBytes(r.iv), ciphertext: hexToBytes(r.ciphertext) };
  },

  async openItem(aad, sealed) {
    const mod = loadNative();
    if (!mod) throw new Error('NO_NATIVE');
    return hexToBytes(
      await mod.openItem(aad, bytesToHex(sealed.iv), bytesToHex(sealed.ciphertext)),
    );
  },

  async enrollDevice() {
    const mod = loadNative();
    if (!mod) throw new Error('NO_NATIVE');
    return mod.enrollDevice();
  },

  async unlockDevice(wrapped) {
    const mod = loadNative();
    if (!mod) throw new Error('NO_NATIVE');
    await mod.unlockDevice(wrapped);
  },

  async clearDevice() {
    await loadNative()?.clearDevice();
  },
};

// Native core is active; it owns userKey so it never reaches JS.
const USE_NATIVE_CORE = true;

/** Native when enabled and available, JS otherwise. */
export function getCryptoCore(): CryptoCore {
  return USE_NATIVE_CORE && isNativeCryptoAvailable() ? nativeCryptoCore : jsCryptoCore;
}
