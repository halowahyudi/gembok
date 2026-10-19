import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { unlockAccount } from '@/auth/account';
import { formatSecretKeyInput } from '@/auth/emergency-kit';
import { authErrorMessage } from '@/auth/errors';
import {
  enrollBiometric,
  hasBiometricEnrollment,
  isBiometricSupported,
  unlockWithBiometric,
} from '@/device/biometric';
import { SecretInput } from '@/features/vault/SecretInput';
import { isValidEmail } from '@/lib/validation';
import { useSessionStore } from '@/store/session';
import {
  NeoButton,
  NeoCard,
  NeoInput,
  NeoLoadingOverlay,
  NeoNotice,
  NeoScreen,
  NeoTag,
  NeoText,
  useTheme,
} from '@/theme';

export default function SignIn() {
  const theme = useTheme();
  const router = useRouter();
  const unlock = useSessionStore((s) => s.unlock);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bioReady, setBioReady] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => {
    let active = true;
    isBiometricSupported()
      .then((supported) => (supported ? hasBiometricEnrollment() : false))
      .then((enrolled) => {
        if (active) setBioReady(enrolled);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const openVault = (result: {
    email: string;
    userId: string;
    vaultId: string;
    recoveryEnabled: boolean;
  }) => {
    unlock(result);
    router.replace('/authenticator');
  };

  const tryBiometric = async () => {
    setError(null);
    setBioBusy(true);
    try {
      const result = await unlockWithBiometric();
      if (!result) {
        setError('Verifikasi sidik jari gagal atau dibatalkan.');
        return;
      }
      openVault({ ...result, recoveryEnabled: true });
    } catch {
      setError('Gagal membuka dengan sidik jari. Coba masuk manual.');
    } finally {
      setBioBusy(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (!isValidEmail(email)) {
      setError('Masukkan alamat email yang valid.');
      return;
    }
    if (!password || !secretKey.trim()) {
      setError('Lengkapi kata sandi dan kunci keamanan.');
      return;
    }

    setBusy(true);
    try {
      const result = await unlockAccount({
        email,
        password,
        secretKey,
      });
      if (await isBiometricSupported()) {
        await enrollBiometric({
          userId: result.userId,
          email: result.email,
          vaultId: result.vaultId,
        }).catch(() => undefined);
      }
      openVault(result);
    } catch (e) {
      console.error('[gembok] login failed:', e);
      const raw = e instanceof Error ? e.message : String(e);
      setError(`${authErrorMessage(e)} [${raw}]`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <NeoScreen scroll>
      <View style={{ gap: 4 }}>
        <NeoText variant="display">Masuk</NeoText>
        <NeoText color={theme.colors.muted}>Buka brankas Anda.</NeoText>
      </View>

      {bioReady ? (
        <NeoCard accent={theme.colors.green}>
          <View style={{ gap: 12 }}>
            <NeoTag label="PALING CEPAT" color={theme.colors.green} />
            <NeoText variant="subtitle">Masuk pakai sidik jari</NeoText>
            <NeoText>
              Sekali sentuh, langsung terbuka. Tidak perlu mengetik dan tidak perlu menunggu
              lama.
            </NeoText>
            <NeoButton
              title="Buka dengan sidik jari"
              variant="success"
              fullWidth
              loading={bioBusy}
              onPress={tryBiometric}
            />
            <NeoText variant="caption" align="center" color={theme.colors.muted}>
              Tidak bisa? Masuk manual di bawah.
            </NeoText>
          </View>
        </NeoCard>
      ) : null}

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
          <SecretInput
            label="Kata sandi utama"
            value={password}
            onChangeText={setPassword}
            placeholder="Kata sandi Anda"
          />
          <NeoInput
            label="Kunci keamanan"
            value={secretKey}
            onChangeText={(value) => setSecretKey(formatSecretKeyInput(value))}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>
      </NeoCard>

      {error ? <NeoNotice title="Gagal masuk" message={error} /> : null}

      <View style={{ gap: 12 }}>
        <NeoButton title="Masuk" fullWidth loading={busy} onPress={submit} />
        <NeoButton
          title="Belum punya akun"
          variant="surface"
          fullWidth
          onPress={() => router.replace('/sign-up')}
        />
        <NeoButton
          title="Lupa kata sandi?"
          variant="surface"
          fullWidth
          onPress={() => router.push('/recover')}
        />
      </View>

      <NeoLoadingOverlay visible={busy} message="Membuka brankas..." />
    </NeoScreen>
  );
}
