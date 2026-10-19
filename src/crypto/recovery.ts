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

function normalize(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Back to entropy. Throws on a bad phrase.
export function recoveryPhraseToEntropy(mnemonic: string): Uint8Array {
  const normalized = normalize(mnemonic);
  if (!validateMnemonic(normalized, wordlist)) {
    throw new Error('Invalid recovery phrase.');
  }
  return mnemonicToEntropy(normalized, wordlist);
}
