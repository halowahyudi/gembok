import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { authErrorMessage } from '@/auth/errors';
import { enableRecovery } from '@/auth/recovery';
import { clearRecoveryNudge } from '@/device/recovery-nudge';
import { useSessionStore } from '@/store/session';
import {
  NeoButton,
  NeoCard,
  NeoInput,
  NeoNotice,
  NeoScreen,
  NeoText,
  useTheme,
} from '@/theme';

export default function EnableRecovery() {
  const theme = useTheme();
  const router = useRouter();
  const markRecoveryEnabled = useSessionStore((s) => s.markRecoveryEnabled);

  const [mnemonic, setMnemonic] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (mnemonic.trim().split(/\s+/).length !== 24) {
      setError('Frasa pemulihan harus 24 kata.');
      return;
    }
    setBusy(true);
    try {
      await enableRecovery({ mnemonic });
      markRecoveryEnabled();
      await clearRecoveryNudge();
      router.replace('/authenticator');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <NeoScreen scroll>
      <View style={{ gap: 4 }}>
        <NeoText variant="display">Aktifkan Pemulihan</NeoText>
        <NeoText color={theme.colors.muted}>
          Satu langkah agar akun Anda bisa dipulihkan.
        </NeoText>
      </View>

      <NeoCard accent={theme.colors.primary}>
        <NeoText>
          Masukkan 24 kata dari Kit Darurat Anda. Kami memakainya sekali untuk memastikan
          frasanya benar, lalu menyimpan kunci cadangan agar akun Anda bisa dipulihkan
          jika suatu saat lupa kata sandi.
        </NeoText>
      </NeoCard>

      <NeoCard>
        <NeoInput
          label="Frasa pemulihan (24 kata)"
          value={mnemonic}
          onChangeText={setMnemonic}
          placeholder="kata1 kata2 kata3 ..."
          multiline
          numberOfLines={4}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ minHeight: 96, textAlignVertical: 'top' }}
        />
      </NeoCard>

      {error ? <NeoNotice title="Tidak bisa diaktifkan" message={error} /> : null}

      <View style={{ gap: 12 }}>
        <NeoButton title="Aktifkan pemulihan" fullWidth loading={busy} onPress={submit} />
        <NeoButton
          title="Nanti saja"
          variant="surface"
          fullWidth
          onPress={() => router.replace('/authenticator')}
        />
      </View>
    </NeoScreen>
  );
}
