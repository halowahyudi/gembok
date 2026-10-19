import assert from 'node:assert/strict';
import { test } from 'node:test';

import { packSealed, seal, unpackSealed } from '../crypto/cipher';
import { generateUserKey } from '../crypto/keys';
import { randomBytes } from '../crypto/random';
import { byteaToBytes, bytesToBytea } from '../db/codec';
import { isValidEmail, masterPasswordIssue, normalizeEmail } from '../lib/validation';
import {
  buildEmergencyKitText,
  formatSecretKey,
  formatSecretKeyInput,
  type EmergencyKitData,
} from './emergency-kit';

test('packSealed/unpackSealed round-trips a Sealed value', () => {
  const key = generateUserKey();
  const plaintext = randomBytes(40);
  const packed = packSealed(seal(key, plaintext, 'ctx'));
  const unpacked = unpackSealed(packed);
  assert.equal(unpacked.iv.length, 12);
  assert.deepEqual(packed.subarray(0, 12), unpacked.iv);
  assert.throws(() => unpackSealed(new Uint8Array(4)));
});

test('bytea codec round-trips with and without the \\x prefix', () => {
  const bytes = randomBytes(24);
  const encoded = bytesToBytea(bytes);
  assert.ok(encoded.startsWith('\\x'));
  assert.deepEqual(byteaToBytes(encoded), bytes);
  assert.deepEqual(byteaToBytes(encoded.slice(2)), bytes);
});

test('email validation and normalization', () => {
  assert.ok(isValidEmail('a@b.co'));
  assert.ok(!isValidEmail('nope'));
  assert.equal(normalizeEmail('  A@B.CO '), 'a@b.co');
});

test('master password policy reports short and simple inputs', () => {
  assert.equal(masterPasswordIssue('short'), 'TOO_SHORT');
  assert.equal(masterPasswordIssue('onlyletters'), 'TOO_SIMPLE');
  assert.equal(masterPasswordIssue('letters12345'), null);
});

test('secret key formatting groups characters in fours with dashes', () => {
  assert.equal(formatSecretKey('ABCDEFGHIJKL'), 'ABCD-EFGH-IJKL');
  assert.equal(formatSecretKey('abcd efgh ijkl'), 'ABCD-EFGH-IJKL');
  assert.equal(formatSecretKey('ABCD'), 'ABCD');
});

test('secret key input formatter uppercases, filters, and groups', () => {
  assert.equal(formatSecretKeyInput('abcd'), 'ABCD');
  assert.equal(formatSecretKeyInput('abcdefgh'), 'ABCD-EFGH');
  assert.equal(formatSecretKeyInput('ab-cd ef!gh'), 'ABCD-EFGH');
  assert.equal(formatSecretKeyInput('1'), '');
});

test('emergency kit text contains email, secret key, and recovery words', () => {
  const kit: EmergencyKitData = {
    email: 'user@example.com',
    secretKey: 'ABCDEFGHIJKLMNOP',
    recoveryMnemonic: 'alpha beta gamma',
  };
  const text = buildEmergencyKitText(kit);
  assert.ok(text.includes('GEMBOK - KIT DARURAT'));
  assert.ok(text.includes('user@example.com'));
  assert.ok(text.includes('ABCD-EFGH-IJKL-MNOP'));
  assert.ok(text.includes('alpha beta gamma'));
});
