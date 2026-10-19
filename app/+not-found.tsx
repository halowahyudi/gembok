import { Link } from 'expo-router';
import { View } from 'react-native';

import { NeoButton, NeoScreen, NeoText } from '@/theme';

export default function NotFound() {
  return (
    <NeoScreen contentStyle={{ justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ gap: 16, alignItems: 'center' }}>
        <NeoText variant="display">404</NeoText>
        <NeoText variant="subtitle">Halaman tidak ditemukan</NeoText>
        <Link href="/" asChild>
          <NeoButton title="Kembali" />
        </Link>
      </View>
    </NeoScreen>
  );
}
