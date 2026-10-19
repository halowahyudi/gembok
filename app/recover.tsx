import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { authErrorMessage } from '@/auth/errors';
import { recoverAccount } from '@/auth/recovery';
import { enrollBiometric, isBiometricSupported } from '@/device/biometric';
import {
  MIN_MASTER_PASSWORD_LENGTH,
  isValidEmail,
  masterPasswordIssue,
} from '@/lib/validation';
import { useOnboardingStore } from '@/store/onboarding';
import { useSessionStore } from '@/store/session';
import {
  NeoButton,
  NeoCard,
  NeoInput,
  NeoLoadingOverlay,
  NeoNotice,
  NeoScreen,
  NeoText,
  useTheme,
} from '@/theme';

export default function Recover() {
  const theme = useTheme();
  const router = useRouter();
  const setEmergencyKit = useOnboardingStore((s) => s.setEmergencyKit);
  const unlock = useSessionStore((s) => s.unlock);

  const [email, setEmail] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!isValidEmail(email)) {
      setError('Masukkan alamat email yang valid.');
      return;
    }
    if (mnemonic.trim().split(/\s+/).length !== 24) {
      setError('Frasa pemulihan harus 24 kata.');
      return;
    }
    const issue = masterPasswordIssue(password);
    if (issue === 'TOO_SHORT') {
      setError(`Kata sandi minimal ${MIN_MASTER_PASSWORD_LENGTH} karakter.`);
      return;
    }
    if (issue === 'TOO_SIMPLE') {
      setError('Gunakan kombinasi huruf dan angka atau simbol.');
      return;
    }
    if (password !== confirm) {
      setError('Konfirmasi kata sandi tidak sama.');
      return;
    }

    setBusy(true);
    try {
      const result = await recoverAccount({
        email,
        mnemonic,
        newPassword: password,
      });
      if (await isBiometricSupported()) {
        await enrollBiometric({
          userId: result.userId,
          email: result.email,
          vaultId: result.vaultId,
        }).catch(() => undefined);
      }
      setEmergencyKit({
        email: result.email,
        secretKey: result.secretKey,
        recoveryMnemonic: result.recoveryMnemonic,
      });
      unlock({
        email: result.email,
        userId: result.userId,
        vaultId: result.vaultId,
        recoveryEnabled: true,
      });
      router.replace('/emergency-kit');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <NeoScreen scroll>
      <View style={{ gap: 4 }}>
        <NeoText variant="display">Pulihkan Akun</NeoText>
        <NeoText color={theme.colors.muted}>
          Masukkan 24 kata dari Kit Darurat Anda.
        </NeoText>
      </View>

      <NeoCard>
        <View style={{ gap: 16 }}>
          <NeoInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="nama@contoh.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
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
          <NeoInput
            label="Kata sandi baru"
            value={password}
            onChangeText={setPassword}
            placeholder="Minimal 10 karakter"
            secureTextEntry
          />
          <NeoInput
            label="Ulangi kata sandi baru"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Ulangi kata sandi"
            secureTextEntry
          />
        </View>
      </NeoCard>

      {error ? <NeoNotice title="Gagal memulihkan" message={error} /> : null}

      <View style={{ gap: 12 }}>
        <NeoButton title="Pulihkan akun" fullWidth loading={busy} onPress={submit} />
        <NeoButton title="Kembali" variant="surface" fullWidth onPress={() => router.back()} />
      </View>

      <NeoLoadingOverlay visible={busy} message="Memulihkan akun..." />
    </NeoScreen>
  );
}
