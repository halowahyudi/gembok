import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { signOut } from '@/auth/account';
import { clearBiometric } from '@/device/biometric';
import { useSessionStore } from '@/store/session';
import { NeoButton, NeoCard, NeoScreen, NeoText, useTheme } from '@/theme';
import { useVaultStore } from '@/vault/store';

export default function SettingsTab() {
  const theme = useTheme();
  const router = useRouter();
  const email = useSessionStore((s) => s.email);
  const lock = useSessionStore((s) => s.lock);
  const clearEntries = useVaultStore((s) => s.clear);

  const onLock = () => {
    clearEntries();
    lock();
    router.replace('/sign-in');
  };

  const onSignOut = async () => {
    clearEntries();
    await clearBiometric().catch(() => undefined);
    lock();
    try {
      await signOut();
    } catch {
      // Nothing to do if sign-out fails; the vault is already locked.
    }
    router.replace('/');
  };

  return (
    <NeoScreen scroll>
      <View style={{ gap: 4 }}>
        <NeoText variant="display">Pengaturan</NeoText>
        <NeoText color={theme.colors.muted}>{email}</NeoText>
      </View>

      <NeoCard>
        <View style={{ gap: 8 }}>
          <NeoText variant="subtitle">Keamanan</NeoText>
          <NeoText color={theme.colors.muted}>
            Brankas terkunci otomatis saat aplikasi ditutup atau lama tidak dipakai.
            Layar tidak bisa difoto.
          </NeoText>
        </View>
      </NeoCard>

      <View style={{ gap: 12 }}>
        <NeoButton
          title="Ganti kata sandi"
          fullWidth
          onPress={() => router.push('/change-password')}
        />
        <NeoButton title="Kunci brankas" variant="danger" fullWidth onPress={onLock} />
        <NeoButton title="Keluar akun" variant="surface" fullWidth onPress={onSignOut} />
      </View>
    </NeoScreen>
  );
}
