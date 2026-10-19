import assert from 'node:assert/strict';
import { test } from 'node:test';

import { utf8ToBytes } from '@noble/hashes/utils.js';
import { base32nopad } from '@scure/base';

import { generateTotp, parseOtpAuthUri, totpRemainingSeconds } from './totp';

const encode = (value: string) => base32nopad.encode(utf8ToBytes(value));
const sha1Secret = encode('12345678901234567890');
const sha256Secret = encode('12345678901234567890123456789012');
const sha512Secret = encode(
  '1234567890123456789012345678901234567890123456789012345678901234',
);

test('TOTP matches RFC 6238 SHA1 vectors', () => {
  const cases: [number, string][] = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ];
  for (const [seconds, expected] of cases) {
    assert.equal(
      generateTotp({ secret: sha1Secret, digits: 8 }, seconds * 1000),
      expected,
    );
  }
});

test('TOTP matches RFC 6238 SHA256 vectors', () => {
  const cases: [number, string][] = [
    [59, '46119246'],
    [1111111109, '68084774'],
    [1111111111, '67062674'],
    [1234567890, '91819424'],
    [2000000000, '90698825'],
    [20000000000, '77737706'],
  ];
  for (const [seconds, expected] of cases) {
    assert.equal(
      generateTotp({ secret: sha256Secret, algorithm: 'SHA256', digits: 8 }, seconds * 1000),
      expected,
    );
  }
});

test('TOTP matches RFC 6238 SHA512 vectors', () => {
  const cases: [number, string][] = [
    [59, '90693936'],
    [1111111109, '25091201'],
    [1111111111, '99943326'],
    [1234567890, '93441116'],
    [2000000000, '38618901'],
    [20000000000, '47863826'],
  ];
  for (const [seconds, expected] of cases) {
    assert.equal(
      generateTotp({ secret: sha512Secret, algorithm: 'SHA512', digits: 8 }, seconds * 1000),
      expected,
    );
  }
});

test('default output is 6 digits', () => {
  assert.equal(generateTotp({ secret: sha1Secret }, 59000), '287082');
});

test('remaining seconds counts down inside the period', () => {
  assert.equal(totpRemainingSeconds(30, 0), 30);
  assert.equal(totpRemainingSeconds(30, 29_000), 1);
  assert.equal(totpRemainingSeconds(30, 30_000), 30);
});

test('parses an otpauth URI', () => {
  const data = parseOtpAuthUri(
    'otpauth://totp/ACME%20Co:john@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ACME%20Co&algorithm=SHA256&digits=8&period=60',
  );
  assert.equal(data.issuer, 'ACME Co');
  assert.equal(data.account, 'john@example.com');
  assert.equal(data.secret, 'JBSWY3DPEHPK3PXP');
  assert.equal(data.algorithm, 'SHA256');
  assert.equal(data.digits, 8);
  assert.equal(data.period, 60);
});

test('rejects invalid otpauth URIs', () => {
  assert.throws(() => parseOtpAuthUri('https://example.com'));
  assert.throws(() => parseOtpAuthUri('otpauth://hotp/x?secret=JBSWY3DPEHPK3PXP'));
  assert.throws(() => parseOtpAuthUri('otpauth://totp/x'));
});
