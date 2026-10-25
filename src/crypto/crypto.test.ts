import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bytesToHex, utf8ToBytes } from './bytes';
import { open, seal } from './cipher';
import { HKDF_INFO, NONCE_LENGTH } from './constants';
import { jsKdf, TEST_KDF_PARAMS } from './kdf';
import {
  decodeSecretKey,
  deriveAccountKeys,
  deriveAuthSecret,
  deriveEncMasterKey,
  deriveMasterKey,
  deriveRecoveryAuthHash,
  deriveRecoveryEncKey,
  deriveSecretKeyVerifier,
  encodeSecretKey,
  generateSecretKey,
  generateUserKey,
  unwrapUserKey,
  unwrapUserKeyFromRecovery,
  wrapUserKey,
  wrapUserKeyForRecovery,
} from './keys';
import { randomBytes } from './random';
import { generateRecoveryPhrase, recoveryPhraseToEntropy } from './recovery';

const subtle = globalThis.crypto.subtle;

/** Web Crypto's BufferSource rejects TS 6's Uint8Array<ArrayBufferLike>. */
const bs = (bytes: Uint8Array): BufferSource => bytes as unknown as BufferSource;

test('jsKdf matches the OpenSSL-verified Argon2id vector', async () => {
  const salt = Uint8Array.from({ length: 16 }, (_, i) => i);
  const out = await jsKdf.derive('correct horse battery staple', salt, TEST_KDF_PARAMS);
  assert.equal(
    bytesToHex(out),
    'f0d1525842159cef972608e2f8bc1cb2c8230f81eea76f124789f6beb42403b2',
  );
});

test('jsKdf is deterministic and sensitive to password and salt', async () => {
  const salt = randomBytes(16);
  const a = await jsKdf.derive('password', salt, TEST_KDF_PARAMS);
  const b = await jsKdf.derive('password', salt, TEST_KDF_PARAMS);
  const c = await jsKdf.derive('password!', salt, TEST_KDF_PARAMS);
  const d = await jsKdf.derive('password', randomBytes(16), TEST_KDF_PARAMS);
  assert.equal(a.length, 32);
  assert.deepEqual(a, b);
  assert.notEqual(bytesToHex(a), bytesToHex(c));
  assert.notEqual(bytesToHex(a), bytesToHex(d));
});

test('deriveAuthSecret matches Web Crypto HKDF', async () => {
  const masterKey = randomBytes(32);
  const salt = randomBytes(16);
  const ours = deriveAuthSecret(masterKey, salt);

  const imported = await subtle.importKey('raw', bs(masterKey), 'HKDF', false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: bs(salt),
      info: bs(utf8ToBytes(HKDF_INFO.auth)),
    },
    imported,
    256,
  );

  assert.equal(bytesToHex(ours), bytesToHex(new Uint8Array(bits)));
});

test('auth and encryption keys are domain-separated', () => {
  const masterKey = randomBytes(32);
  const salt = randomBytes(16);
  assert.notEqual(
    bytesToHex(deriveAuthSecret(masterKey, salt)),
    bytesToHex(deriveEncMasterKey(masterKey, salt)),
  );
});

test('masterKey requires both the derived key and the secret key', () => {
  const derived = randomBytes(32);
  const salt = randomBytes(16);
  const withA = deriveMasterKey(derived, generateSecretKey(), salt);
  const withB = deriveMasterKey(derived, generateSecretKey(), salt);
  assert.notEqual(bytesToHex(withA), bytesToHex(withB));
});

test('AES-256-GCM interops with Web Crypto in both directions', async () => {
  const key = randomBytes(32);
  const aad = utf8ToBytes('aad-context');
  const plaintext = utf8ToBytes('rahasia penting');

  const sealed = seal(key, plaintext, aad);
  assert.equal(sealed.iv.length, NONCE_LENGTH);
  assert.equal(sealed.ciphertext.length, plaintext.length + 16);

  const imported = await subtle.importKey('raw', bs(key), 'AES-GCM', false, ['encrypt', 'decrypt']);
  const webPlain = await subtle.decrypt(
    { name: 'AES-GCM', iv: bs(sealed.iv), additionalData: bs(aad), tagLength: 128 },
    imported,
    bs(sealed.ciphertext),
  );
  assert.deepEqual(new Uint8Array(webPlain), plaintext);

  const webIv = randomBytes(NONCE_LENGTH);
  const webSealed = new Uint8Array(
    await subtle.encrypt(
      { name: 'AES-GCM', iv: bs(webIv), additionalData: bs(aad), tagLength: 128 },
      imported,
      bs(plaintext),
    ),
  );
  assert.deepEqual(open(key, webIv, webSealed, aad), plaintext);
});

test('seal/open roundtrip and rejection of tampering', () => {
  const key = randomBytes(32);
  const plaintext = utf8ToBytes('hello vault');
  const aad = 'item-aad';

  const sealed = seal(key, plaintext, aad);
  assert.deepEqual(open(key, sealed.iv, sealed.ciphertext, aad), plaintext);

  const tampered = sealed.ciphertext.slice();
  tampered[0] ^= 0xff;
  assert.throws(() => open(key, sealed.iv, tampered, aad));

  assert.throws(() => open(key, sealed.iv, sealed.ciphertext, 'other-aad'));
  assert.throws(() => open(randomBytes(32), sealed.iv, sealed.ciphertext, aad));
});

test('userKey wraps and unwraps with encMasterKey', async () => {
  const userKey = generateUserKey();
  const salt = randomBytes(32);
  const { encMasterKey } = await deriveAccountKeys({
    kdf: jsKdf,
    password: 'master-password',
    salt,
    secretKey: generateSecretKey(),
    params: TEST_KDF_PARAMS,
  });

  const sealed = wrapUserKey(userKey, encMasterKey);
  assert.deepEqual(unwrapUserKey(sealed, encMasterKey), userKey);
  assert.throws(() => unwrapUserKey(sealed, generateUserKey()));
});

test('secret key encodes to base32 and decodes back', () => {
  const secretKey = generateSecretKey();
  assert.equal(secretKey.length, 16);
  const encoded = encodeSecretKey(secretKey);
  assert.match(encoded, /^[A-Z2-7]+$/);
  assert.deepEqual(decodeSecretKey(encoded), secretKey);
  // Grouped with dashes or spaces must still decode.
  const grouped = encoded.replace(/(.{4})/g, '$1-').replace(/-+$/, '');
  assert.deepEqual(decodeSecretKey(grouped), secretKey);
  assert.deepEqual(decodeSecretKey(encoded.replace(/(.{4})/g, '$1 ').trim()), secretKey);
});

test('secret key verifier is stable and unique per key', () => {
  const secretKey = generateSecretKey();
  assert.deepEqual(
    deriveSecretKeyVerifier(secretKey),
    deriveSecretKeyVerifier(secretKey),
  );
  assert.notEqual(
    bytesToHex(deriveSecretKeyVerifier(secretKey)),
    bytesToHex(deriveSecretKeyVerifier(generateSecretKey())),
  );
});

test('recovery phrase has 24 words and round-trips to entropy', () => {
  const { entropy, mnemonic } = generateRecoveryPhrase();
  assert.equal(entropy.length, 32);
  assert.equal(mnemonic.split(' ').length, 24);
  assert.deepEqual(recoveryPhraseToEntropy(mnemonic), entropy);
  assert.throws(() => recoveryPhraseToEntropy('not a valid phrase'));
});

test('userKey wraps and unwraps for recovery', () => {
  const userKey = generateUserKey();
  const { entropy } = generateRecoveryPhrase();
  const recoveryEncKey = deriveRecoveryEncKey(entropy);

  const sealed = wrapUserKeyForRecovery(userKey, recoveryEncKey);
  assert.deepEqual(unwrapUserKeyFromRecovery(sealed, recoveryEncKey), userKey);
  assert.throws(() =>
    unwrapUserKeyFromRecovery(sealed, deriveRecoveryEncKey(generateRecoveryPhrase().entropy)),
  );
});

test('recovery auth hash is stable and unique per phrase', () => {
  const { entropy, mnemonic } = generateRecoveryPhrase();
  assert.deepEqual(
    deriveRecoveryAuthHash(entropy),
    deriveRecoveryAuthHash(recoveryPhraseToEntropy(mnemonic)),
  );
  assert.notEqual(
    bytesToHex(deriveRecoveryAuthHash(entropy)),
    bytesToHex(deriveRecoveryAuthHash(generateRecoveryPhrase().entropy)),
  );
});

test('recovery flow reconstructs userKey from the phrase', () => {
  const userKey = generateUserKey();
  const { entropy, mnemonic } = generateRecoveryPhrase();
  const sealed = wrapUserKeyForRecovery(userKey, deriveRecoveryEncKey(entropy));
  const recoveredKey = deriveRecoveryEncKey(recoveryPhraseToEntropy(mnemonic));
  assert.deepEqual(unwrapUserKeyFromRecovery(sealed, recoveredKey), userKey);
});

test('full signup and unlock flow reconstructs the same userKey', async () => {
  const salt = randomBytes(32);
  const secretKey = generateSecretKey();
  const userKey = generateUserKey();
  const password = 'a-strong-master-password';

  const signup = await deriveAccountKeys({
    kdf: jsKdf,
    password,
    salt,
    secretKey,
    params: TEST_KDF_PARAMS,
  });
  const sealed = wrapUserKey(userKey, signup.encMasterKey);

  const unlock = await deriveAccountKeys({
    kdf: jsKdf,
    password,
    salt,
    secretKey,
    params: TEST_KDF_PARAMS,
  });
  assert.deepEqual(unwrapUserKey(sealed, unlock.encMasterKey), userKey);
  assert.deepEqual(unlock.authSecret, signup.authSecret);
});

test('account recovery rotates secret key, updates verifier, and rewraps userKey', async () => {
  const salt = randomBytes(32);
  const userKey = generateUserKey();
  const initialSecretKey = generateSecretKey();
  const initialVerifier = deriveSecretKeyVerifier(initialSecretKey);

  const { entropy, mnemonic } = generateRecoveryPhrase();
  const recoveryEncKey = deriveRecoveryEncKey(entropy);
  const protectedUserKeyRecovery = wrapUserKeyForRecovery(userKey, recoveryEncKey);

  // User recovers account with mnemonic
  const recoveredRecoveryKey = deriveRecoveryEncKey(recoveryPhraseToEntropy(mnemonic));
  const recoveredUserKey = unwrapUserKeyFromRecovery(protectedUserKeyRecovery, recoveredRecoveryKey);
  assert.deepEqual(recoveredUserKey, userKey);

  // Fresh secret key and new password generated during recovery
  const newSecretKey = generateSecretKey();
  const newPassword = 'new-password-456';
  const newVerifier = deriveSecretKeyVerifier(newSecretKey);

  assert.notDeepEqual(initialVerifier, newVerifier);

  // Re-wrap userKey with new credentials
  const newAccountKeys = await deriveAccountKeys({
    kdf: jsKdf,
    password: newPassword,
    salt,
    secretKey: newSecretKey,
    params: TEST_KDF_PARAMS,
  });
  const newProtectedUserKey = wrapUserKey(recoveredUserKey, newAccountKeys.encMasterKey);

  // Subsequent login with new credentials succeeds against new verifier and unwraps userKey
  assert.deepEqual(deriveSecretKeyVerifier(newSecretKey), newVerifier);
  assert.notDeepEqual(deriveSecretKeyVerifier(newSecretKey), initialVerifier);

  const loginKeys = await deriveAccountKeys({
    kdf: jsKdf,
    password: newPassword,
    salt,
    secretKey: newSecretKey,
    params: TEST_KDF_PARAMS,
  });
  const unlockedUserKey = unwrapUserKey(newProtectedUserKey, loginKeys.encMasterKey);
  assert.deepEqual(unlockedUserKey, userKey);
});
