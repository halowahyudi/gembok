import { bytesToUtf8, utf8ToBytes } from '@/crypto/bytes';
import type { TotpAlgorithm } from '@/totp/totp';

export type VaultItemType = 'login' | 'totp' | 'pin' | 'card' | 'note';

export function isVaultItemType(value: unknown): value is VaultItemType {
  return (
    value === 'login' ||
    value === 'totp' ||
    value === 'pin' ||
    value === 'card' ||
    value === 'note'
  );
}

// In-memory shape of an item. Every field always exists (empty string when
// unused) which keeps the codec simple and old items decodable. Only ever held
// in memory.
export type VaultItem = {
  id: string;
  type: VaultItemType;
  title: string;
  username: string;
  password: string;
  url: string;
  pin: string;
  cardHolder: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  totpSecret: string;
  totpAlgorithm: TotpAlgorithm;
  totpDigits: number;
  totpPeriod: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

// A decrypted item plus the server revision it was loaded at.
export type VaultEntry = {
  item: VaultItem;
  rev: number;
};

export type VaultItemDraft = {
  type?: VaultItemType;
  title: string;
  username?: string;
  password?: string;
  url?: string;
  pin?: string;
  cardHolder?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  totpSecret?: string;
  totpAlgorithm?: TotpAlgorithm;
  totpDigits?: number;
  totpPeriod?: number;
  notes?: string;
};

const EPOCH = '1970-01-01T00:00:00.000Z';

// Fill in missing fields so items written by older versions still decode.
export function normalizeItem(value: Partial<VaultItem> & { id: string }): VaultItem {
  return {
    id: value.id,
    type: value.type ?? 'login',
    title: value.title ?? '',
    username: value.username ?? '',
    password: value.password ?? '',
    url: value.url ?? '',
    pin: value.pin ?? '',
    cardHolder: value.cardHolder ?? '',
    cardNumber: value.cardNumber ?? '',
    cardExpiry: value.cardExpiry ?? '',
    cardCvv: value.cardCvv ?? '',
    totpSecret: value.totpSecret ?? '',
    totpAlgorithm: value.totpAlgorithm ?? 'SHA1',
    totpDigits: value.totpDigits ?? 6,
    totpPeriod: value.totpPeriod ?? 30,
    notes: value.notes ?? '',
    createdAt: value.createdAt ?? EPOCH,
    updatedAt: value.updatedAt ?? EPOCH,
  };
}

// Merge form input into an item, keeping createdAt and stamping updatedAt.
export function buildItem(
  id: string,
  draft: VaultItemDraft,
  timestamp: string,
  existing?: VaultItem,
): VaultItem {
  const base = existing ?? normalizeItem({ id });
  return {
    ...base,
    id,
    type: draft.type ?? base.type,
    title: draft.title.trim(),
    username: draft.username?.trim() ?? base.username,
    password: draft.password ?? base.password,
    url: draft.url?.trim() ?? base.url,
    pin: draft.pin ?? base.pin,
    cardHolder: draft.cardHolder?.trim() ?? base.cardHolder,
    cardNumber: draft.cardNumber?.trim() ?? base.cardNumber,
    cardExpiry: draft.cardExpiry?.trim() ?? base.cardExpiry,
    cardCvv: draft.cardCvv ?? base.cardCvv,
    totpSecret: draft.totpSecret?.replace(/\s/g, '') ?? base.totpSecret,
    totpAlgorithm: draft.totpAlgorithm ?? base.totpAlgorithm,
    totpDigits: draft.totpDigits ?? base.totpDigits,
    totpPeriod: draft.totpPeriod ?? base.totpPeriod,
    notes: draft.notes ?? base.notes,
    createdAt: base.createdAt,
    updatedAt: timestamp,
  };
}

export function serializeItem(item: VaultItem): Uint8Array {
  return utf8ToBytes(JSON.stringify(item));
}

export function parseItem(bytes: Uint8Array): VaultItem {
  const raw = JSON.parse(bytesToUtf8(bytes)) as Partial<VaultItem> & { id: string };
  return normalizeItem(raw);
}
