import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
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
  const { error } = useVaultLoader();
  const [query, setQuery] = useState('');

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
          ListEmptyComponent={
            <NeoCard>
              <View style={{ gap: 8 }}>
                <NeoTag label="KOSONG" color={theme.colors.purple} />
                <NeoText variant="title">Belum ada data</NeoText>
                <NeoText>Tekan tombol Password untuk menyimpan akun pertama Anda.</NeoText>
              </View>
            </NeoCard>
          }
        />
      </View>
    </SafeAreaView>
  );
}
