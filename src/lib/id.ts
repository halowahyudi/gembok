import * as Crypto from 'expo-crypto';

// UUID for a new item. Kept out of the pure modules so tests don't pull in
// expo-crypto.
export function newId(): string {
  return Crypto.randomUUID();
}
