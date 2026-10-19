import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import { getCryptoCore } from '@/crypto/core';

const DEVICE_VAULT_ID = 'gembok.device-vault';

// Set while the biometric sheet is open, so auto-lock doesn't fight it.
let authenticating = false;

export function isAuthenticating(): boolean {
  return authenticating;
}

type DeviceVault = {
  userId: string;
  email: string;
  vaultId: string;
  /** Opaque wrapped key produced by the crypto core. */
  wrapped: string;
};

export type BiometricUnlockResult = {
  userId: string;
  email: string;
  vaultId: string;
};

// Device has biometric hardware and the user enrolled something.
export async function isBiometricSupported(): Promise<boolean> {
  const [hasHardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && enrolled;
}

// A device vault already exists on this device.
export async function hasBiometricEnrollment(): Promise<boolean> {
  const vault = await SecureStore.getItemAsync(DEVICE_VAULT_ID);
  return Boolean(vault);
}

// Ask the core to wrap its vault key for this device; we only keep the blob.
export async function enrollBiometric(input: {
  userId: string;
  email: string;
  vaultId: string;
}): Promise<void> {
  const wrapped = await getCryptoCore().enrollDevice();
  const vault: DeviceVault = {
    userId: input.userId,
    email: input.email,
    vaultId: input.vaultId,
    wrapped,
  };
  await SecureStore.setItemAsync(DEVICE_VAULT_ID, JSON.stringify(vault));
}

// Verify with biometrics, then let the core unwrap its key. Null if cancelled.
export async function unlockWithBiometric(): Promise<BiometricUnlockResult | null> {
  authenticating = true;
  let auth: LocalAuthentication.LocalAuthenticationResult;
  try {
    auth = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Buka brankas Gembok',
      cancelLabel: 'Batal',
    });
  } finally {
    authenticating = false;
  }
  if (!auth.success) return null;

  const json = await SecureStore.getItemAsync(DEVICE_VAULT_ID);
  if (!json) return null;

  const vault = JSON.parse(json) as DeviceVault;
  await getCryptoCore().unlockDevice(vault.wrapped);
  return { userId: vault.userId, email: vault.email, vaultId: vault.vaultId };
}

// Drop the device vault and the native device key.
export async function clearBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(DEVICE_VAULT_ID).catch(() => undefined);
  await getCryptoCore().clearDevice();
}
