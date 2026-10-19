import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { buildEmergencyKitText, formatSecretKey } from '@/auth/emergency-kit';
import { useOnboardingStore } from '@/store/onboarding';
import {
  NeoButton,
  NeoCard,
  NeoCheckbox,
  NeoScreen,
  NeoTag,
  NeoText,
  useTheme,
} from '@/theme';

export default function EmergencyKit() {
  const theme = useTheme();
  const router = useRouter();
  const kit = useOnboardingStore((s) => s.emergencyKit);
  const clearEmergencyKit = useOnboardingStore((s) => s.clearEmergencyKit);

  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!kit && !finishedRef.current) router.replace('/');
  }, [kit, router]);

  if (!kit) return null;

  const words = kit.recoveryMnemonic.split(' ');

  const copyAll = async () => {
    await Clipboard.setStringAsync(buildEmergencyKitText(kit));
    setCopied(true);
  };

  const finish = () => {
    finishedRef.current = true;
    clearEmergencyKit();
    router.replace('/authenticator');
  };

  return (
    <NeoScreen scroll>
      <View style={{ gap: 4 }}>
        <NeoText variant="display">Kit Darurat</NeoText>
        <NeoText color={theme.colors.muted}>
          Simpan informasi ini di tempat aman, terpisah dari ponsel Anda.
        </NeoText>
      </View>

      <NeoCard accent={theme.colors.blue}>
        <View style={{ gap: 8 }}>
          <NeoTag label="KUNCI KEAMANAN" color={theme.colors.blue} />
          <NeoText variant="subtitle">{formatSecretKey(kit.secretKey)}</NeoText>
          <NeoText variant="caption" color={theme.colors.muted}>
            Dibutuhkan setiap kali masuk di perangkat baru.
          </NeoText>
        </View>
      </NeoCard>

      <NeoCard accent={theme.colors.purple}>
        <View style={{ gap: 12 }}>
          <NeoTag label="FRASA PEMULIHAN" color={theme.colors.purple} />
          <NeoText color={theme.colors.muted}>
            Kunci cadangan Anda. Dipakai kalau suatu saat lupa kata sandi utama. Tanpa
            frasa ini, isi brankas tidak dapat dibuka lagi.
          </NeoText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {words.map((word, index) => (
              <View
                key={`${index}-${word}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  borderWidth: 2,
                  borderColor: theme.colors.ink,
                  borderRadius: theme.radius.sm,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  backgroundColor: theme.colors.surface,
                }}
              >
                <NeoText variant="caption" color={theme.colors.muted}>
                  {index + 1}
                </NeoText>
                <NeoText variant="label">{word}</NeoText>
              </View>
            ))}
          </View>
        </View>
      </NeoCard>

      <NeoCard accent={theme.colors.primary}>
        <View style={{ gap: 8 }}>
          <NeoTag label="WAJIB DISIMPAN" color={theme.colors.primary} />
          <NeoText variant="subtitle">Simpan sekarang, jangan nanti</NeoText>
          <NeoText>
            Tulis Kunci Keamanan dan 24 kata di kertas, lalu simpan di tempat aman yang
            berbeda dari HP ini. Jangan hanya difoto dan disimpan di HP ini.
          </NeoText>
        </View>
      </NeoCard>

      <NeoButton
        title={copied ? 'Tersalin' : 'Salin Kit Darurat'}
        variant="surface"
        fullWidth
        onPress={copyAll}
      />

      <NeoCheckbox
        checked={confirmed}
        onChange={setConfirmed}
        label="Saya sudah menyimpan kunci dan frasa ini di tempat yang aman."
      />

      <NeoButton
        title="Lanjut ke brankas"
        fullWidth
        disabled={!confirmed}
        onPress={finish}
      />
    </NeoScreen>
  );
}
