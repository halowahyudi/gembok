import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseGoogleMigrationUri } from './google-migration';

test('parses official Google Authenticator migration test vector', () => {
  const uri =
    'otpauth-migration://offline?data=CjEKCkhlbGxvId6tvu8SGEV4YW1wbGU6YWxpY2VAZ29vZ2xlLmNvbRoHRXhhbXBsZTAC';

  const accounts = parseGoogleMigrationUri(uri);
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].title, 'Example');
  assert.equal(accounts[0].username, 'alice@google.com');
  assert.equal(accounts[0].secret, 'JBSWY3DPEHPK3PXP');
  assert.equal(accounts[0].algorithm, 'SHA1');
  assert.equal(accounts[0].digits, 6);
  assert.equal(accounts[0].period, 30);
});

test('parses urlencoded migration URI', () => {
  const uri =
    'otpauth-migration://offline?data=CjEKCkhlbGxvId6tvu8SGEV4YW1wbGU6YWxpY2VAZ29vZ2xlLmNvbRoHRXhhbXBsZTAC&foo=bar';

  const accounts = parseGoogleMigrationUri(uri);
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].secret, 'JBSWY3DPEHPK3PXP');
});

test('throws on invalid migration URI', () => {
  assert.throws(() => parseGoogleMigrationUri('otpauth-migration://offline?nodata=1'));
  assert.throws(() => parseGoogleMigrationUri('not-a-migration'));
});
