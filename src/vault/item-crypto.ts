import { open, seal, type Sealed } from '@/crypto/cipher';
import { AAD } from '@/crypto/constants';

import { parseItem, serializeItem, type VaultItem } from './models';

// AAD ties ciphertext to the owner, item id, and revision, so it can't be moved
// to another item or replayed at a different revision.
export function itemAad(userId: string, itemId: string, rev: number): string {
  return `${AAD.item}|${userId}|${itemId}|${rev}`;
}

export function encryptItem(
  userKey: Uint8Array,
  userId: string,
  item: VaultItem,
  rev: number,
): Sealed {
  return seal(userKey, serializeItem(item), itemAad(userId, item.id, rev));
}

export function decryptItem(args: {
  userKey: Uint8Array;
  userId: string;
  itemId: string;
  rev: number;
  iv: Uint8Array;
  ciphertext: Uint8Array;
}): VaultItem {
  const bytes = open(
    args.userKey,
    args.iv,
    args.ciphertext,
    itemAad(args.userId, args.itemId, args.rev),
  );
  return parseItem(bytes);
}
