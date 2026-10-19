import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { NeoButton, NeoCard, NeoScreen, NeoTag, NeoText, useTheme } from '@/theme';

export default function Home() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <NeoScreen scroll>
      <View style={{ gap: 4 }}>
        <NeoText variant="display">GEMBOK</NeoText>
        <NeoText variant="subtitle" color={theme.colors.muted}>
          Password Anda, terkunci rapat.
        </NeoText>
      </View>

      <NeoCard accent={theme.colors.red}>
        <View style={{ gap: 12 }}>
          <NeoTag label="PRIVASI" color={theme.colors.green} />
          <NeoText variant="title">Hanya Anda yang bisa membukanya</NeoText>
          <NeoText>
            Semua password diacak di perangkat Anda dan tidak pernah dikirim dalam bentuk
            asli. Tidak ada pihak lain yang bisa membacanya.
          </NeoText>
        </View>
      </NeoCard>

      <View style={{ gap: 12, marginTop: 8 }}>
        <NeoButton title="Mulai" fullWidth onPress={() => router.push('/sign-up')} />
        <NeoButton
          title="Saya sudah punya akun"
          variant="surface"
          fullWidth
          onPress={() => router.push('/sign-in')}
        />
        <NeoButton
          title="Pulihkan akun"
          variant="surface"
          fullWidth
          onPress={() => router.push('/recover')}
        />
      </View>
    </NeoScreen>
  );
}
