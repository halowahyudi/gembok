import { requireNativeModule } from 'expo-modules-core';

export type GembokCryptoNativeModule = {
  isUnlocked(): boolean;
  lock(): void;
  /** Create the vault key natively; it stays in native memory. */
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
  sealItem(
    aad: string,
    plaintextHex: string,
  ): Promise<{ iv: string; ciphertext: string }>;
  openItem(aad: string, ivHex: string, ciphertextHex: string): Promise<string>;
};

export default requireNativeModule<GembokCryptoNativeModule>('GembokCrypto');
