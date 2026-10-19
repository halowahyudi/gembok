import { SECRET_KEY_LENGTH } from '../crypto/constants';

export type EmergencyKitData = {
  email: string;
  secretKey: string;
  recoveryMnemonic: string;
};

// Base32 length of a 16-byte secret key.
export const SECRET_KEY_MAX_CHARS = Math.ceil((SECRET_KEY_LENGTH * 8) / 5);

// Group into fours with dashes: ABCD-EFGH-...
export function formatSecretKey(secretKey: string): string {
  return secretKey
    .replace(/[^A-Za-z2-7]/g, '')
    .toUpperCase()
    .replace(/(.{4})/g, '$1-')
    .replace(/-+$/, '');
}

// Same idea, but for live input: uppercase, drop anything invalid, cap the
// length, then add the dashes.
export function formatSecretKeyInput(value: string): string {
  const clean = value
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '')
    .slice(0, SECRET_KEY_MAX_CHARS);
  return clean.replace(/(.{4})/g, '$1-').replace(/-+$/, '');
}

// Plain-text Emergency Kit the user copies or writes down. Kept pure so the
// content is easy to test.
export function buildEmergencyKitText(data: EmergencyKitData): string {
  return [
    'GEMBOK - KIT DARURAT',
    '',
    'Simpan dokumen ini di tempat aman, terpisah dari ponsel Anda.',
    'Tanpa informasi di bawah, isi brankas tidak dapat dipulihkan.',
    '',
    `Email: ${data.email}`,
    '',
    `Kunci Keamanan: ${formatSecretKey(data.secretKey)}`,
    '',
    'Frasa Pemulihan (24 kata):',
    data.recoveryMnemonic,
    '',
  ].join('\n');
}
