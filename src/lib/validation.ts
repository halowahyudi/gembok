// Input checks. We return codes (not text) so the UI can map them to Indonesian,
// non-technical messages.

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export type PasswordIssue = 'TOO_SHORT' | 'TOO_SIMPLE' | null;

export const MIN_MASTER_PASSWORD_LENGTH = 10;

export function masterPasswordIssue(password: string): PasswordIssue {
  if (password.length < MIN_MASTER_PASSWORD_LENGTH) return 'TOO_SHORT';
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasOther = /[^a-zA-Z]/.test(password);
  if (!hasLetter || !hasOther) return 'TOO_SIMPLE';
  return null;
}
