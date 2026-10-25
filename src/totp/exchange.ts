import type { VaultItem, VaultItemDraft } from '@/vault/models';

import { parseGoogleMigrationUri } from './google-migration';
import { decodeBase32Secret, parseOtpAuthUri } from './totp';

// Build an otpauth:// URI for an authenticator item. This is the format every
// major authenticator app understands, so it doubles as our exchange format.
export function buildOtpAuthUri(item: VaultItem): string {
  const issuer = item.title.trim();
  const account = item.username.trim();
  const label = issuer
    ? `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`
    : encodeURIComponent(account);
  const params = [
    `secret=${encodeURIComponent(item.totpSecret.replace(/\s/g, ''))}`,
    issuer ? `issuer=${encodeURIComponent(issuer)}` : '',
    `algorithm=${item.totpAlgorithm}`,
    `digits=${item.totpDigits}`,
    `period=${item.totpPeriod}`,
  ].filter(Boolean);
  return `otpauth://totp/${label}?${params.join('&')}`;
}

// One URI per line.
export function exportAuthenticatorText(items: VaultItem[]): string {
  return items
    .filter((item) => item.type === 'totp' && item.totpSecret.length > 0)
    .map(buildOtpAuthUri)
    .join('\n');
}

export type AuthenticatorImport = {
  drafts: VaultItemDraft[];
  /** Lines that could not be read as a 2FA account. */
  invalid: number;
  /** Accounts that already exist (same secret) or repeat within the input. */
  duplicates: number;
};

function secretKey(secret: string): string {
  return secret.replace(/[\s-]/g, '').replace(/=+$/, '').toUpperCase();
}

// Read otpauth:// lines (blank lines ignored). Anything already present in
// `existingSecrets`, or repeated in the input, is counted as a duplicate.
export function parseAuthenticatorImport(
  text: string,
  existingSecrets: string[] = [],
): AuthenticatorImport {
  const seen = new Set(existingSecrets.map(secretKey));
  const result: AuthenticatorImport = { drafts: [], invalid: 0, duplicates: 0 };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^otpauth-migration:\/\//i.test(line) || /(?:^|[?&])data=/i.test(line)) {
      try {
        const accounts = parseGoogleMigrationUri(line);
        if (accounts.length === 0) {
          result.invalid += 1;
          continue;
        }
        for (const account of accounts) {
          decodeBase32Secret(account.secret);
          const key = secretKey(account.secret);
          if (seen.has(key)) {
            result.duplicates += 1;
            continue;
          }
          seen.add(key);
          result.drafts.push({
            type: 'totp',
            title: account.title || account.username || 'Tanpa nama',
            username: account.username,
            totpSecret: account.secret,
            totpAlgorithm: account.algorithm,
            totpDigits: account.digits,
            totpPeriod: account.period,
          });
        }
        continue;
      } catch {
        result.invalid += 1;
        continue;
      }
    }

    try {
      const parsed = parseOtpAuthUri(line);
      decodeBase32Secret(parsed.secret); // reject secrets we cannot use
      const key = secretKey(parsed.secret);
      if (seen.has(key)) {
        result.duplicates += 1;
        continue;
      }
      seen.add(key);
      result.drafts.push({
        type: 'totp',
        title: parsed.issuer || parsed.account || 'Tanpa nama',
        username: parsed.account,
        totpSecret: parsed.secret,
        totpAlgorithm: parsed.algorithm,
        totpDigits: parsed.digits,
        totpPeriod: parsed.period,
      });
    } catch {
      result.invalid += 1;
    }
  }
  return result;
}
