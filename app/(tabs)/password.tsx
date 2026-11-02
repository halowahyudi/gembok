import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VaultItemCard } from '@/features/vault/VaultItemCard';
import { VaultToolbar } from '@/features/vault/VaultToolbar';
import { NeoButton, NeoCard, NeoNotice, NeoTag, NeoText, useTheme } from '@/theme';
import { filterEntries } from '@/vault/query';
import { useVaultStore } from '@/vault/store';
import { useVaultLoader } from '@/vault/use-vault';

export default function PasswordTab() {
  const theme = useTheme();
  const router = useRouter();
  const entries = useVaultStore((s) => s.entries);
  const { loading, loaded, error, refresh } = useVaultLoader();
  const [query, setQuery] = useState('');

  const isLoading = (!loaded && !error) || (loading && entries.length === 0);

  const visible = useMemo(
    () => filterEntries(entries, query, 'password'),
    [entries, query],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{ flex: 1, padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <View style={{ gap: 4 }}>
          <NeoText variant="display">Password</NeoText>
          <NeoText color={theme.colors.muted}>Login, PIN, kartu, dan catatan.</NeoText>
        </View>

        <NeoButton
          title="+ Password"
          fullWidth
          onPress={() =>
            router.push({
              pathname: '/item/new',
              params: { mode: 'password', type: 'login' },
            })
          }
        />

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
          refreshControl={
            <RefreshControl
              refreshing={loading && loaded}
              onRefresh={refresh}
              colors={[theme.colors.ink]}
              tintColor={theme.colors.ink}
            />
          }
          ListEmptyComponent={
            isLoading ? (
              <NeoCard>
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: theme.spacing.xl,
                    gap: theme.spacing.md,
                  }}
                >
                  <ActivityIndicator size="large" color={theme.colors.ink} />
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <NeoText variant="subtitle">Memuat data...</NeoText>
                    <NeoText variant="caption" color={theme.colors.muted}>
                      Mengambil data dari server
                    </NeoText>
                  </View>
                </View>
              </NeoCard>
            ) : error ? (
              <NeoCard>
                <View style={{ gap: 8 }}>
                  <NeoTag label="GAGAL" color={theme.colors.purple} />
                  <NeoText variant="title">Tidak dapat memuat data</NeoText>
                  <NeoText color={theme.colors.muted}>
                    Tarik ke bawah atau tekan tombol untuk mencoba lagi.
                  </NeoText>
                  <NeoButton title="Coba lagi" variant="surface" onPress={refresh} />
                </View>
              </NeoCard>
            ) : query.trim() ? (
              <NeoCard>
                <View style={{ gap: 8 }}>
                  <NeoTag label="TIDAK DITEMUKAN" color={theme.colors.primary} />
                  <NeoText variant="title">Tidak ada hasil</NeoText>
                  <NeoText color={theme.colors.muted}>
                    Tidak ada data yang cocok dengan &quot;{query}&quot;.
                  </NeoText>
                </View>
              </NeoCard>
            ) : (
              <NeoCard>
                <View style={{ gap: 8 }}>
                  <NeoTag label="KOSONG" color={theme.colors.purple} />
                  <NeoText variant="title">Belum ada data</NeoText>
                  <NeoText>
                    Tekan tombol Password untuk menyimpan akun pertama Anda.
                  </NeoText>
                </View>
              </NeoCard>
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}
