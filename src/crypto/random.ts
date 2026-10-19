// Random bytes from a CSPRNG. Node and web have WebCrypto; React Native doesn't
// guarantee it, so we fall back to expo-crypto there.
export function randomBytes(length: number): Uint8Array {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    return webCrypto.getRandomValues(new Uint8Array(length));
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const expoCrypto = require('expo-crypto') as typeof import('expo-crypto');
  return expoCrypto.getRandomBytes(length);
}
