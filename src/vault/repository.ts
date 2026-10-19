import { getSupabase } from '@/auth/supabase';
import { getCryptoCore } from '@/crypto/core';
import { byteaToBytes, bytesToBytea } from '@/db/codec';

import { itemAad } from './item-crypto';
import { parseItem, serializeItem, type VaultEntry, type VaultItem } from './models';

// Storage interface for items. The crypto core owns the vault key, so callers
// never pass key material here.
export interface VaultRepository {
  list(args: { userId: string; vaultId: string }): Promise<VaultEntry[]>;
  create(args: { userId: string; vaultId: string; item: VaultItem }): Promise<VaultEntry>;
  update(args: { userId: string; item: VaultItem; rev: number }): Promise<VaultEntry>;
  remove(args: { userId: string; itemId: string }): Promise<void>;
}

type ItemRow = {
  id: string;
  ciphertext: string;
  iv: string;
  rev: number;
};

export const supabaseVaultRepository: VaultRepository = {
  async list({ userId, vaultId }) {
    const { data, error } = await getSupabase()
      .from('items')
      .select('id, ciphertext, iv, rev')
      .eq('vault_id', vaultId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });
    if (error) throw error;

    const core = getCryptoCore();
    return Promise.all(
      (data as ItemRow[]).map(async (row) => ({
        rev: row.rev,
        item: parseItem(
          await core.openItem(itemAad(userId, row.id, row.rev), {
            iv: byteaToBytes(row.iv),
            ciphertext: byteaToBytes(row.ciphertext),
          }),
        ),
      })),
    );
  },

  async create({ userId, vaultId, item }) {
    const rev = 1;
    const sealed = await getCryptoCore().sealItem(
      itemAad(userId, item.id, rev),
      serializeItem(item),
    );
    const { error } = await getSupabase().from('items').insert({
      id: item.id,
      user_id: userId,
      vault_id: vaultId,
      ciphertext: bytesToBytea(sealed.ciphertext),
      iv: bytesToBytea(sealed.iv),
      rev,
    });
    if (error) throw error;
    return { item, rev };
  },

  async update({ userId, item, rev }) {
    const nextRev = rev + 1;
    const sealed = await getCryptoCore().sealItem(
      itemAad(userId, item.id, nextRev),
      serializeItem(item),
    );
    const { data, error } = await getSupabase()
      .from('items')
      .update({
        ciphertext: bytesToBytea(sealed.ciphertext),
        iv: bytesToBytea(sealed.iv),
        rev: nextRev,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)
      .eq('user_id', userId)
      .eq('rev', rev)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('SYNC_CONFLICT');
    return { item, rev: nextRev };
  },

  async remove({ userId, itemId }) {
    const { error } = await getSupabase()
      .from('items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', itemId)
      .eq('user_id', userId);
    if (error) throw error;
  },
};
