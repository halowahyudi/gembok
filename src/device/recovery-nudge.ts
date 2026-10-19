import AsyncStorage from '@react-native-async-storage/async-storage';

// Gentle reminder for users who never enabled account recovery. It reappears at
// most every this many days, and stops for good once recovery is turned on.
const KEY = 'gembok.recovery-nudge-at';
const INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export async function shouldShowRecoveryNudge(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return true;
    const at = Number(raw);
    return !Number.isFinite(at) || Date.now() - at > INTERVAL_MS;
  } catch {
    return false;
  }
}

export async function markRecoveryNudged(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Reminder is best-effort; ignore storage failures.
  }
}

export async function clearRecoveryNudge(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}
