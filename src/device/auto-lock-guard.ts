// Some system UI (permission dialogs, camera) briefly backgrounds the app.
// While that's expected, auto-lock should not fire, or the vault would lock
// every time we open the camera or ask for a permission.
let suppressed = 0;

export function acquireAutoLockSuppression(): void {
  suppressed += 1;
}

export function releaseAutoLockSuppression(): void {
  suppressed = Math.max(0, suppressed - 1);
}

export function isAutoLockSuppressed(): boolean {
  return suppressed > 0;
}
