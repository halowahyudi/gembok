import {
  entropyToMnemonic,
  mnemonicToEntropy,
  validateMnemonic,
} from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

import { randomBytes } from './random';

// 256 bits of entropy encodes to 24 BIP-39 words.
export const RECOVERY_ENTROPY_BYTES = 32;

export type RecoveryPhrase = {
  entropy: Uint8Array;
  mnemonic: string;
};

// New recovery phrase. Shown to the user once, during signup.
export function generateRecoveryPhrase(): RecoveryPhrase {
  const entropy = randomBytes(RECOVERY_ENTROPY_BYTES);
  return { entropy, mnemonic: entropyToMnemonic(entropy, wordlist) };
}

// Normalize a user-supplied recovery phrase:
// - If the user pasted the full Emergency Kit text, extract the section after "Frasa Pemulihan"
// - Strip optional numbering ("1. word", "1) word", etc.) and punctuation
// - Lowercase and collapse whitespace
export function normalizeRecoveryMnemonic(mnemonic: string): string {
  let raw = mnemonic;
  const kitMatch = raw.match(/frasa\s+pemulihan[^:\n]*:\s*([\s\S]+)/i);
  if (kitMatch?.[1]) {
    raw = kitMatch[1];
  }
  return raw
    .toLowerCase()
    .replace(/(?:^|\s+)\d+[\.\)\-:]?\s*/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Back to entropy. Throws on a bad phrase.
export function recoveryPhraseToEntropy(mnemonic: string): Uint8Array {
  const normalized = normalizeRecoveryMnemonic(mnemonic);
  if (!validateMnemonic(normalized, wordlist)) {
    throw new Error('INVALID_RECOVERY');
  }
  return mnemonicToEntropy(normalized, wordlist);
}
