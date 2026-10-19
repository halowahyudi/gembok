import { View } from 'react-native';

import { NeoCard, NeoScreen, NeoTag, NeoText, useTheme } from '@/theme';

export default function DocumentsTab() {
  const theme = useTheme();

  return (
    <NeoScreen scroll>
      <View style={{ gap: 4 }}>
        <NeoText variant="display">Dokumen</NeoText>
        <NeoText color={theme.colors.muted}>Simpan berkas penting dengan aman.</NeoText>
      </View>

      <NeoCard accent={theme.colors.purple}>
        <View style={{ gap: 12 }}>
          <NeoTag label="SEGERA HADIR" color={theme.colors.purple} />
          <NeoText variant="title">Dokumen Brankas</NeoText>
          <NeoText>
            Kami sedang menyiapkan cara paling aman untuk menyimpan dokumen sensitif Anda
            — KTP, SIM, NPWP, hingga berkas penting lainnya. Setiap dokumen akan
            dienkripsi menyeluruh di perangkat Anda, sehingga tidak ada seorang pun,
            termasuk kami, yang dapat membukanya.
          </NeoText>
          <NeoText variant="caption" color={theme.colors.muted}>
            Fitur ini akan tersedia di pembaruan berikutnya.
          </NeoText>
        </View>
      </NeoCard>
    </NeoScreen>
  );
}
