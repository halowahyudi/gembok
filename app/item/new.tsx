import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { vaultErrorMessage } from '@/auth/errors';
import { AuthenticatorForm } from '@/features/totp/AuthenticatorForm';
import { ItemForm } from '@/features/vault/ItemForm';
import { newId } from '@/lib/id';
import { useSessionStore } from '@/store/session';
import { NeoButton, NeoScreen, NeoText, useTheme } from '@/theme';
import {
  buildItem,
  isVaultItemType,
  type VaultItemDraft,
  type VaultItemType,
} from '@/vault/models';
import { supabaseVaultRepository } from '@/vault/repository';
import { useVaultStore } from '@/vault/store';

export default function NewItem() {
  const theme = useTheme();
  const router = useRouter();
  const { type: typeParam, mode } = useLocalSearchParams<{
    type?: string;
    mode?: string;
  }>();

  const isAuthenticator = mode === 'authenticator' || typeParam === 'totp';

  const userId = useSessionStore((s) => s.userId);
  const vaultId = useSessionStore((s) => s.vaultId);
  const upsert = useVaultStore((s) => s.upsert);

  const [type, setType] = useState<VaultItemType>(
    isVaultItemType(typeParam) ? typeParam : 'login',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (draft: VaultItemDraft) => {
    if (!userId || !vaultId) {
      setError('Sesi tidak aktif. Buka brankas ulang.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const item = buildItem(newId(), draft, new Date().toISOString());
      const entry = await supabaseVaultRepository.create({
        userId,
        vaultId,
        item,
      });
      upsert(entry);
      router.back();
    } catch (e) {
      setError(vaultErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <NeoScreen scroll>
      <View style={{ gap: 4 }}>
        <NeoText variant="display">{isAuthenticator ? 'Authenticator' : 'Tambah'}</NeoText>
        <NeoText color={theme.colors.muted}>
          {isAuthenticator
            ? 'Tambahkan akun Authenticator baru.'
            : 'Simpan data baru ke brankas.'}
        </NeoText>
      </View>

      {isAuthenticator ? (
        <AuthenticatorForm
          submitLabel="Simpan"
          saving={saving}
          error={error}
          onSubmit={submit}
        />
      ) : (
        <ItemForm
          type={type}
          onTypeChange={setType}
          submitLabel="Simpan"
          saving={saving}
          error={error}
          onSubmit={submit}
        />
      )}

      <NeoButton title="Batal" variant="surface" fullWidth onPress={() => router.back()} />
    </NeoScreen>
  );
}
