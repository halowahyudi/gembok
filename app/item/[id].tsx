import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { vaultErrorMessage } from '@/auth/errors';
import { AuthenticatorForm } from '@/features/totp/AuthenticatorForm';
import { ItemForm } from '@/features/vault/ItemForm';
import { ITEM_TYPE_LABEL } from '@/features/vault/itemTypes';
import { useSessionStore } from '@/store/session';
import { NeoButton, NeoCard, NeoConfirmModal, NeoScreen, NeoText, useTheme } from '@/theme';
import { buildItem, type VaultItemDraft } from '@/vault/models';
import { supabaseVaultRepository } from '@/vault/repository';
import { useVaultStore } from '@/vault/store';

export default function ItemDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const userId = useSessionStore((s) => s.userId);
  const entry = useVaultStore((s) => s.entries.find((e) => e.item.id === id));
  const upsert = useVaultStore((s) => s.upsert);
  const remove = useVaultStore((s) => s.remove);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!entry) {
    return (
      <NeoScreen>
        <NeoCard>
          <View style={{ gap: 12 }}>
            <NeoText variant="title">Data tidak ditemukan</NeoText>
            <NeoButton title="Kembali" onPress={() => router.back()} />
          </View>
        </NeoCard>
      </NeoScreen>
    );
  }

  const submit = async (draft: VaultItemDraft) => {
    if (!userId) {
      setError('Sesi tidak aktif. Buka brankas ulang.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const item = buildItem(entry.item.id, draft, new Date().toISOString(), entry.item);
      const updated = await supabaseVaultRepository.update({
        userId,
        item,
        rev: entry.rev,
      });
      upsert(updated);
      router.back();
    } catch (e) {
      setError(vaultErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onRequestDelete = () => {
    setShowConfirmDelete(true);
  };

  const onConfirmDelete = async () => {
    if (!userId) {
      setError('Sesi tidak aktif. Buka brankas ulang.');
      setShowConfirmDelete(false);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await supabaseVaultRepository.remove({ userId, itemId: entry.item.id });
      remove(entry.item.id);
      setShowConfirmDelete(false);
      router.back();
    } catch (e) {
      setShowConfirmDelete(false);
      setError(vaultErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <NeoScreen scroll>
      <View style={{ gap: 4 }}>
        <NeoText variant="display">Detail</NeoText>
        <NeoText color={theme.colors.muted}>{ITEM_TYPE_LABEL[entry.item.type]}</NeoText>
      </View>

      {entry.item.type === 'totp' ? (
        <AuthenticatorForm
          initial={entry.item}
          submitLabel="Simpan perubahan"
          saving={saving}
          deleting={deleting}
          error={error}
          onSubmit={submit}
          onDelete={onRequestDelete}
        />
      ) : (
        <ItemForm
          type={entry.item.type}
          initial={entry.item}
          submitLabel="Simpan perubahan"
          saving={saving}
          deleting={deleting}
          error={error}
          onSubmit={submit}
          onDelete={onRequestDelete}
        />
      )}

      <NeoConfirmModal
        visible={showConfirmDelete}
        title="Hapus data ini?"
        message={
          entry.item.title
            ? `"${entry.item.title}" akan dihapus permanen dari brankas Anda. Tindakan ini tidak bisa dibatalkan.`
            : 'Data ini akan dihapus permanen dari brankas Anda. Tindakan ini tidak bisa dibatalkan.'
        }
        confirmLabel="Hapus"
        cancelLabel="Batal"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={onConfirmDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />

      <NeoButton
        title="Kembali"
        variant="surface"
        fullWidth
        onPress={() => router.back()}
      />
    </NeoScreen>
  );
}
