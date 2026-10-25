import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { markRecoveryNudged, shouldShowRecoveryNudge } from '@/device/recovery-nudge';
import { VaultItemCard } from '@/features/vault/VaultItemCard';
import { VaultToolbar } from '@/features/vault/VaultToolbar';
import { useSessionStore } from '@/store/session';
import { NeoButton, NeoCard, NeoNotice, NeoTag, NeoText, useTheme } from '@/theme';
import { filterEntries } from '@/vault/query';
import { useVaultStore } from '@/vault/store';
import { useVaultLoader } from '@/vault/use-vault';

export default function AuthenticatorTab() {
  const theme = useTheme();
  const router = useRouter();
  const entries = useVaultStore((s) => s.entries);
  const { error } = useVaultLoader();
  const [query, setQuery] = useState('');
  const recoveryEnabled = useSessionStore((s) => s.recoveryEnabled);
  const [showNudge, setShowNudge] = useState(false);

  useEffect(() => {
    if (recoveryEnabled) return;
    let active = true;
    shouldShowRecoveryNudge().then((due) => {
      if (!active || !due) return;
      setShowNudge(true);
      void markRecoveryNudged();
    });
    return () => {
      active = false;
    };
  }, [recoveryEnabled]);

  const visible = useMemo(
    () => filterEntries(entries, query, 'authenticator'),
    [entries, query],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{ flex: 1, padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <View style={{ gap: 4 }}>
          <NeoText variant="display">Authenticator</NeoText>
          <NeoText color={theme.colors.muted}>
            Kode 2FA Anda. Tahan kode untuk menyalinnya.
          </NeoText>
        </View>

        {showNudge ? (
          <NeoCard accent={theme.colors.primary}>
            <View style={{ gap: 8 }}>
              <NeoTag label="PENGINGAT" color={theme.colors.primary} />
              <NeoText variant="subtitle">Aktifkan pemulihan akun</NeoText>
              <NeoText color={theme.colors.muted}>
                Agar akun Anda bisa dipulihkan jika lupa kata sandi. Butuh 24 kata dari
                Kit Darurat.
              </NeoText>
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                <NeoButton
                  title="Aktifkan"
                  size="sm"
                  style={{ flex: 1 }}
                  onPress={() => router.push('/enable-recovery')}
                />
                <NeoButton
                  title="Nanti"
                  size="sm"
                  variant="surface"
                  style={{ flex: 1 }}
                  onPress={() => setShowNudge(false)}
                />
              </View>
            </View>
          </NeoCard>
        ) : null}

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <NeoButton
            title="+ Authenticator"
            style={{ flex: 1 }}
            onPress={() =>
              router.push({ pathname: '/item/new', params: { mode: 'authenticator' } })
            }
          />
          <NeoButton
            title="Impor & Ekspor"
            variant="surface"
            style={{ flex: 1 }}
            onPress={() => router.push('/authenticator-transfer')}
          />
        </View>

        {error ? <NeoNotice title="Gagal memuat" message={error} /> : null}

        <VaultToolbar query={query} onQueryChange={setQuery} />

        <FlatList
          data={visible}
          keyExtractor={(e) => e.item.id}
          renderItem={({ item }) => (
            <VaultItemCard
              entry={item}
              onPress={() =>
                router.push({ pathname: '/item/[id]', params: { id: item.item.id } })
              }
            />
          )}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
          ListEmptyComponent={
            <NeoCard>
              <View style={{ gap: 8 }}>
                <NeoTag label="KOSONG" color={theme.colors.red} />
                <NeoText variant="title">Belum ada kode 2FA</NeoText>
                <NeoText>
                  Tekan tombol Authenticator untuk menambah dari QR atau manual.
                </NeoText>
              </View>
            </NeoCard>
          }
        />
      </View>
    </SafeAreaView>
  );
}
