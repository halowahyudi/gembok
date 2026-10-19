import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildItem, type VaultEntry, type VaultItemDraft } from './models';
import { filterEntries } from './query';

function entry(id: string, draft: VaultItemDraft, updatedAt: string): VaultEntry {
  return { item: buildItem(id, draft, updatedAt), rev: 1 };
}

const entries: VaultEntry[] = [
  entry(
    '1',
    { type: 'login', title: 'Instagram', username: 'budi' },
    '2024-01-01T00:00:00.000Z',
  ),
  entry(
    '2',
    { type: 'card', title: 'Bank BCA', cardHolder: 'Budi' },
    '2024-03-01T00:00:00.000Z',
  ),
  entry(
    '3',
    { type: 'pin', title: 'PIN ATM', notes: 'kartu merah' },
    '2024-02-01T00:00:00.000Z',
  ),
  entry(
    '4',
    { type: 'totp', title: 'Vercel', totpSecret: 'JBSWY3DPEHPK3PXP' },
    '2024-04-01T00:00:00.000Z',
  ),
];

const ids = (list: VaultEntry[]) => list.map((e) => e.item.id);

test('search matches title, username, and notes case-insensitively', () => {
  assert.deepEqual(ids(filterEntries(entries, 'insta', 'all')), ['1']);
  assert.deepEqual(ids(filterEntries(entries, 'kartu merah', 'all')), ['3']);
  assert.deepEqual(filterEntries(entries, 'zzz', 'all'), []);
  assert.ok(ids(filterEntries(entries, 'BUDI', 'all')).includes('1'));
  assert.ok(ids(filterEntries(entries, 'BUDI', 'all')).includes('2'));
});

test('category authenticator shows only TOTP items', () => {
  assert.deepEqual(ids(filterEntries(entries, '', 'authenticator')), ['4']);
});

test('category password excludes TOTP items', () => {
  assert.deepEqual(ids(filterEntries(entries, '', 'password')), ['2', '3', '1']);
});

test('results are sorted newest first', () => {
  assert.deepEqual(ids(filterEntries(entries, '', 'all')), ['4', '2', '3', '1']);
});
