import assert from 'node:assert/strict';
import { test } from 'node:test';

import { generateUserKey } from '../crypto/keys';
import { decryptItem, encryptItem } from './item-crypto';
import { buildItem, normalizeItem, parseItem, serializeItem } from './models';

test('normalizeItem fills defaults for a legacy login item', () => {
  const item = normalizeItem({ id: 'a', title: 'X' });
  assert.equal(item.type, 'login');
  assert.equal(item.pin, '');
  assert.equal(item.cardNumber, '');
  assert.equal(item.notes, '');
});

test('buildItem preserves createdAt and applies the draft', () => {
  const created = normalizeItem({
    id: 'a',
    title: 'Old',
    username: 'u',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  });
  const next = buildItem(
    'a',
    { title: ' New ', username: ' v ', notes: 'n' },
    '2021-01-01T00:00:00.000Z',
    created,
  );
  assert.equal(next.title, 'New');
  assert.equal(next.username, 'v');
  assert.equal(next.notes, 'n');
  assert.equal(next.createdAt, '2020-01-01T00:00:00.000Z');
  assert.equal(next.updatedAt, '2021-01-01T00:00:00.000Z');
});

test('serialize/parse round-trips a full card item', () => {
  const item = buildItem(
    'id1',
    { type: 'card', title: 'Bank', cardNumber: '1234', cardCvv: '999', pin: '1234' },
    '2022-01-01T00:00:00.000Z',
  );
  assert.deepEqual(parseItem(serializeItem(item)), item);
});

test('serialize/parse round-trips a TOTP item', () => {
  const item = buildItem(
    'id2',
    {
      type: 'totp',
      title: 'Vercel',
      username: 'budi@example.com',
      totpSecret: 'JBSWY3DPEHPK3PXP',
      totpAlgorithm: 'SHA256',
      totpDigits: 8,
      totpPeriod: 60,
    },
    '2022-01-01T00:00:00.000Z',
  );
  const parsed = parseItem(serializeItem(item));
  assert.equal(parsed.type, 'totp');
  assert.equal(parsed.totpSecret, 'JBSWY3DPEHPK3PXP');
  assert.equal(parsed.totpAlgorithm, 'SHA256');
  assert.equal(parsed.totpDigits, 8);
  assert.equal(parsed.totpPeriod, 60);
  assert.deepEqual(parsed, item);
});

test('encrypt/decrypt round-trips and binds AAD to id and rev', () => {
  const userKey = generateUserKey();
  const userId = 'user-1';
  const item = buildItem(
    'item-1',
    { title: 'Secret', password: 'p' },
    '2022-01-01T00:00:00.000Z',
  );

  const sealed = encryptItem(userKey, userId, item, 1);
  const decrypted = decryptItem({
    userKey,
    userId,
    itemId: 'item-1',
    rev: 1,
    iv: sealed.iv,
    ciphertext: sealed.ciphertext,
  });
  assert.deepEqual(decrypted, item);

  assert.throws(() =>
    decryptItem({
      userKey,
      userId,
      itemId: 'item-2',
      rev: 1,
      iv: sealed.iv,
      ciphertext: sealed.ciphertext,
    }),
  );
  assert.throws(() =>
    decryptItem({
      userKey,
      userId,
      itemId: 'item-1',
      rev: 2,
      iv: sealed.iv,
      ciphertext: sealed.ciphertext,
    }),
  );
});
