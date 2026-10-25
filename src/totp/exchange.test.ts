import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeItem } from '../vault/models';
import {
  buildOtpAuthUri,
  exportAuthenticatorText,
  parseAuthenticatorImport,
} from './exchange';

const SECRET = 'JBSWY3DPEHPK3PXP';

function totpItem(id: string, title: string, username: string, secret = SECRET) {
  return normalizeItem({
    id,
    type: 'totp',
    title,
    username,
    totpSecret: secret,
    totpAlgorithm: 'SHA256',
    totpDigits: 8,
    totpPeriod: 60,
  });
}

test('export then import round-trips an account', () => {
  const item = totpItem('1', 'Example & Co', 'ana@example.com');
  const text = exportAuthenticatorText([item]);
  const { drafts, invalid, duplicates } = parseAuthenticatorImport(text);
  assert.equal(invalid, 0);
  assert.equal(duplicates, 0);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].title, 'Example & Co');
  assert.equal(drafts[0].username, 'ana@example.com');
  assert.equal(drafts[0].totpSecret, SECRET);
  assert.equal(drafts[0].totpAlgorithm, 'SHA256');
  assert.equal(drafts[0].totpDigits, 8);
  assert.equal(drafts[0].totpPeriod, 60);
});

test('export skips non-authenticator items', () => {
  const login = normalizeItem({ id: '2', type: 'login', title: 'Site' });
  assert.equal(exportAuthenticatorText([login]), '');
});

test('import counts invalid lines and ignores blanks', () => {
  const uri = buildOtpAuthUri(totpItem('1', 'A', 'a'));
  const { drafts, invalid } = parseAuthenticatorImport(`\n${uri}\nnot a code\n\n`);
  assert.equal(drafts.length, 1);
  assert.equal(invalid, 1);
});

test('import rejects secrets that are not base32', () => {
  const { drafts, invalid } = parseAuthenticatorImport('otpauth://totp/A?secret=!!!!');
  assert.equal(drafts.length, 0);
  assert.equal(invalid, 1);
});

test('import skips existing and repeated secrets', () => {
  const a = buildOtpAuthUri(totpItem('1', 'A', 'a'));
  const b = buildOtpAuthUri(totpItem('2', 'B', 'b', 'GEZDGNBVGY3TQOJQ'));
  const { drafts, duplicates } = parseAuthenticatorImport(`${a}\n${a}\n${b}`, [
    'gezd gnbv gy3t qojq',
  ]);
  assert.equal(drafts.length, 1);
  assert.equal(duplicates, 2);
});

test('import supports Google Authenticator otpauth-migration URI', () => {
  const migrationUri =
    'otpauth-migration://offline?data=CjEKCkhlbGxvId6tvu8SGEV4YW1wbGU6YWxpY2VAZ29vZ2xlLmNvbRoHRXhhbXBsZTAC';
  const { drafts, invalid, duplicates } = parseAuthenticatorImport(migrationUri);
  assert.equal(invalid, 0);
  assert.equal(duplicates, 0);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].title, 'Example');
  assert.equal(drafts[0].username, 'alice@google.com');
  assert.equal(drafts[0].totpSecret, 'JBSWY3DPEHPK3PXP');
  assert.equal(drafts[0].totpAlgorithm, 'SHA1');
  assert.equal(drafts[0].totpDigits, 6);
  assert.equal(drafts[0].totpPeriod, 30);
});
