import { hmac } from '@noble/hashes/hmac.js';
import { sha1 } from '@noble/hashes/legacy.js';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { base32nopad } from '@scure/base';

export type TotpAlgorithm = 'SHA1' | 'SHA256' | 'SHA512';

const HASHES = { SHA1: sha1, SHA256: sha256, SHA512: sha512 } as const;

export type TotpConfig = {
  secret: string;
  algorithm?: TotpAlgorithm;
  digits?: number;
  period?: number;
};

// TOTP secrets are base32. Tolerate spaces, dashes and any padding.
export function decodeBase32Secret(secret: string): Uint8Array {
  const clean = secret.replace(/[\s-]/g, '').replace(/=+$/, '').toUpperCase();
  if (!/^[A-Z2-7]+$/.test(clean)) {
    throw new Error('INVALID_TOTP_SECRET');
  }
  const bytes = base32nopad.decode(clean);
  if (bytes.length === 0) {
    throw new Error('INVALID_TOTP_SECRET');
  }
  return bytes;
}

// 8-byte big-endian counter. JS numbers stay exact well past our range.
function counterToBytes(counter: number): Uint8Array {
  const out = new Uint8Array(8);
  let value = counter;
  for (let i = 7; i >= 0; i -= 1) {
    out[i] = value % 256;
    value = Math.floor(value / 256);
  }
  return out;
}

// RFC 6238. Defaults match what almost every service uses: SHA1, 6 digits, 30s.
export function generateTotp(config: TotpConfig, timestamp = Date.now()): string {
  const { secret, algorithm = 'SHA1', digits = 6, period = 30 } = config;
  const key = decodeBase32Secret(secret);
  const counter = Math.floor(timestamp / 1000 / period);
  const mac = hmac(HASHES[algorithm], key, counterToBytes(counter));

  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff);

  return (binary % 10 ** digits).toString().padStart(digits, '0');
}

export function totpRemainingSeconds(period = 30, timestamp = Date.now()): number {
  const elapsed = Math.floor(timestamp / 1000) % period;
  return period - elapsed;
}

export type OtpAuthData = {
  type: 'totp';
  issuer: string;
  account: string;
  secret: string;
  algorithm: TotpAlgorithm;
  digits: number;
  period: number;
};

// Parse an otpauth:// URI without relying on the URL polyfill. Handles the
// common form: otpauth://totp/Issuer:account?secret=...&issuer=...
export function parseOtpAuthUri(uri: string): OtpAuthData {
  const trimmed = uri.trim();
  if (!/^otpauth:\/\//i.test(trimmed)) {
    throw new Error('INVALID_OTP_URI');
  }
  const rest = trimmed.slice('otpauth://'.length);
  const queryIndex = rest.indexOf('?');
  const hostAndPath = queryIndex === -1 ? rest : rest.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : rest.slice(queryIndex + 1);

  const slash = hostAndPath.indexOf('/');
  const type = (slash === -1 ? hostAndPath : hostAndPath.slice(0, slash)).toLowerCase();
  if (type !== 'totp') {
    throw new Error('UNSUPPORTED_OTP_TYPE');
  }

  const label = decodeURIComponent(slash === -1 ? '' : hostAndPath.slice(slash + 1));
  const colon = label.indexOf(':');
  const labelIssuer = colon === -1 ? '' : label.slice(0, colon).trim();
  const labelAccount = (colon === -1 ? label : label.slice(colon + 1)).trim();

  const params = new Map<string, string>();
  for (const pair of query.split('&')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const key = decodeURIComponent(pair.slice(0, eq)).toLowerCase();
    params.set(key, decodeURIComponent(pair.slice(eq + 1)));
  }

  const secret = (params.get('secret') ?? '').replace(/\s/g, '');
  if (!secret) {
    throw new Error('INVALID_OTP_URI');
  }

  const algorithmRaw = (params.get('algorithm') ?? 'SHA1').toUpperCase();
  const algorithm: TotpAlgorithm =
    algorithmRaw === 'SHA256' || algorithmRaw === 'SHA512' ? algorithmRaw : 'SHA1';
  const digits = Number(params.get('digits')) === 8 ? 8 : 6;
  const periodValue = Number(params.get('period'));

  return {
    type: 'totp',
    issuer: (params.get('issuer') ?? labelIssuer).trim(),
    account: labelAccount,
    secret,
    algorithm,
    digits,
    period: periodValue > 0 ? periodValue : 30,
  };
}
