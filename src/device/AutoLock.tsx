import { usePreventScreenCapture } from 'expo-screen-capture';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { AppState, View } from 'react-native';

import { isAutoLockSuppressed } from '@/device/auto-lock-guard';
import { isAuthenticating } from '@/device/biometric';
import { useSessionStore } from '@/store/session';
import { useVaultStore } from '@/vault/store';

// Lock after this long with no interaction while the app is open.
const IDLE_TIMEOUT_MS = 2 * 60 * 1000;

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

  usePreventScreenCapture('gembok-vault');

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(lockNow, IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      const previous = appState.current;
      appState.current = next;
      // Only react to a real background transition; 'inactive' happens during
      // the biometric prompt and system dialogs.
      if (next === 'background' && previous !== 'background') {
        lockNow();
      }
    });

    resetIdleTimer();
    return () => {
      subscription.remove();
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdleTimer]);

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
