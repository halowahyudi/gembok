import { base32nopad, base64 } from '@scure/base';

import type { TotpAlgorithm } from './totp';

export type GoogleMigrationAccount = {
  type: 'totp';
  title: string;
  username: string;
  secret: string;
  algorithm: TotpAlgorithm;
  digits: number;
  period: number;
};

function readVarint(bytes: Uint8Array, offset: number): [value: number, nextOffset: number] {
  let res = 0;
  let shift = 0;
  while (offset < bytes.length) {
    const b = bytes[offset++];
    res += (b & 0x7f) * (2 ** shift);
    if ((b & 0x80) === 0) break;
    shift += 7;
  }
  return [res, offset];
}

/**
 * Decodes the Protobuf binary payload inside Google Authenticator's
 * `otpauth-migration://offline?data=...` export URL.
 */
export function parseGoogleMigrationPayload(bytes: Uint8Array): GoogleMigrationAccount[] {
  const textDecoder = new TextDecoder();
  const accounts: GoogleMigrationAccount[] = [];
  let offset = 0;

  while (offset < bytes.length) {
    const [tag, nextOffset] = readVarint(bytes, offset);
    offset = nextOffset;
    const field = tag >> 3;
    const wire = tag & 0x07;

    if (wire === 2) {
      const [len, afterLen] = readVarint(bytes, offset);
      const slice = bytes.subarray(afterLen, afterLen + len);
      offset = afterLen + len;

      // Field 1 of MigrationPayload: repeated OtpParameters otp_parameters = 1
      if (field === 1) {
        let pOff = 0;
        let secret = '';
        let name = '';
        let issuer = '';
        let algo: TotpAlgorithm = 'SHA1';
        let digits = 6;
        let otpType = 2; // 1 = HOTP, 2 = TOTP (default)

        while (pOff < slice.length) {
          const [pTag, pNext] = readVarint(slice, pOff);
          pOff = pNext;
          const pField = pTag >> 3;
          const pWire = pTag & 0x07;

          if (pWire === 0) {
            const [val, vNext] = readVarint(slice, pOff);
            pOff = vNext;
            if (pField === 4) {
              if (val === 2) algo = 'SHA256';
              else if (val === 3) algo = 'SHA512';
            } else if (pField === 5) {
              if (val === 2) digits = 8;
            } else if (pField === 6) {
              otpType = val;
            }
          } else if (pWire === 2) {
            const [pLen, pAfterLen] = readVarint(slice, pOff);
            const pSlice = slice.subarray(pAfterLen, pAfterLen + pLen);
            pOff = pAfterLen + pLen;
            if (pField === 1) {
              secret = base32nopad.encode(pSlice);
            } else if (pField === 2) {
              name = textDecoder.decode(pSlice);
            } else if (pField === 3) {
              issuer = textDecoder.decode(pSlice);
            }
          } else if (pWire === 1) {
            pOff += 8;
          } else if (pWire === 5) {
            pOff += 4;
          }
        }

        // We import TOTP accounts (or default when unspecified; skip counter-based HOTP).
        if (secret && otpType !== 1) {
          let account = name.trim();
          let derivedIssuer = issuer.trim();
          const colon = account.indexOf(':');
          if (colon !== -1) {
            if (!derivedIssuer) {
              derivedIssuer = account.slice(0, colon).trim();
            }
            account = account.slice(colon + 1).trim();
          }

          accounts.push({
            type: 'totp',
            title: derivedIssuer || account || 'Google Authenticator',
            username: account,
            secret,
            algorithm: algo,
            digits,
            period: 30,
          });
        }
      }
    } else if (wire === 0) {
      const [, next] = readVarint(bytes, offset);
      offset = next;
    } else if (wire === 1) {
      offset += 8;
    } else if (wire === 5) {
      offset += 4;
    }
  }

  return accounts;
}

/**
 * Extracts and decodes accounts from an `otpauth-migration://offline?data=...` URI
 * or a raw query containing `data=...`.
 */
export function parseGoogleMigrationUri(uri: string): GoogleMigrationAccount[] {
  const trimmed = uri.trim();
  const match = trimmed.match(/(?:^|[?&])data=([^&#\s]+)/i);
  if (!match) {
    throw new Error('INVALID_MIGRATION_URI');
  }

  let b64 = decodeURIComponent(match[1]).replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) {
    b64 += '=';
  }

  const bytes = base64.decode(b64);
  return parseGoogleMigrationPayload(bytes);
}
