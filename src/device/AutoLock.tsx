import { usePreventScreenCapture } from 'expo-screen-capture';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { AppState, View } from 'react-native';

import { isAutoLockSuppressed } from '@/device/auto-lock-guard';
import { isAuthenticating } from '@/device/biometric';
import { useSessionStore } from '@/store/session';
import { useVaultStore } from '@/vault/store';

// Lock after this long with no interaction while the app is open.
const IDLE_TIMEOUT_MS = 2 * 60 * 1000;

// Lock after this long while the app is in the background.
const BACKGROUND_TIMEOUT_MS = 1 * 60 * 1000;

function lockNow(): void {
  // Skip while a biometric prompt or system dialog (e.g. camera permission) is
  // in front of the app.
  if (isAuthenticating() || isAutoLockSuppressed()) return;
  const session = useSessionStore.getState();
  if (!session.unlocked) return;
  useVaultStore.getState().clear();
  session.lock();
}

// Locks the vault on background or idle, and blocks screenshots and the
// app-switcher preview.
export function AutoLock({ children }: { children: ReactNode }) {
  const appState = useRef(AppState.currentState);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundTimestamp = useRef<number | null>(null);

  usePreventScreenCapture('gembok-vault');

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(lockNow, IDLE_TIMEOUT_MS);
  }, []);

  const clearBackgroundTimer = useCallback(() => {
    if (backgroundTimer.current) {
      clearTimeout(backgroundTimer.current);
      backgroundTimer.current = null;
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      const previous = appState.current;
      appState.current = next;

      // When backgrounded, start the 1-minute grace period.
      if (next === 'background' && previous !== 'background') {
        backgroundTimestamp.current = Date.now();
        clearBackgroundTimer();
        backgroundTimer.current = setTimeout(() => {
          lockNow();
        }, BACKGROUND_TIMEOUT_MS);
      } else if (next === 'active' && previous !== 'active') {
        // App resumed: check if the grace period has elapsed.
        clearBackgroundTimer();
        if (backgroundTimestamp.current !== null) {
          const elapsed = Date.now() - backgroundTimestamp.current;
          backgroundTimestamp.current = null;
          if (elapsed >= BACKGROUND_TIMEOUT_MS) {
            lockNow();
          }
        }
        resetIdleTimer();
      }
    });

    resetIdleTimer();
    return () => {
      subscription.remove();
      if (idleTimer.current) clearTimeout(idleTimer.current);
      clearBackgroundTimer();
    };
  }, [clearBackgroundTimer, resetIdleTimer]);

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => {
        resetIdleTimer();
        return false;
      }}
    >
      {children}
    </View>
  );
}
