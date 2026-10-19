import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { createAccount } from '@/auth/account';
import { authErrorMessage } from '@/auth/errors';
import { enrollBiometric, isBiometricSupported } from '@/device/biometric';
import { AwarenessModal } from '@/features/awareness/AwarenessModal';
import { SecretInput } from '@/features/vault/SecretInput';
import { MIN_MASTER_PASSWORD_LENGTH, isValidEmail, masterPasswordIssue } from '@/lib/validation';
import { useOnboardingStore } from '@/store/onboarding';
import { useSessionStore } from '@/store/session';
import { NeoButton, NeoCard, NeoInput, NeoLoadingOverlay, NeoNotice, NeoScreen, NeoText, useTheme } from '@/theme';

export default function SignUp() {
  const theme = useTheme();
  const router = useRouter();
  const setEmergencyKit = useOnboardingStore((s) => s.setEmergencyKit);
  const unlock = useSessionStore((s) => s.unlock);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAwareness, setShowAwareness] = useState(false);

  const validate = (): string | null => {
    if (!isValidEmail(email)) return 'Masukkan alamat email yang valid.';
    const issue = masterPasswordIssue(password);
    if (issue === 'TOO_SHORT') {
      return `Kata sandi minimal ${MIN_MASTER_PASSWORD_LENGTH} karakter.`;
    }
    if (issue === 'TOO_SIMPLE') return 'Gunakan kombinasi huruf dan angka atau simbol.';
    if (password !== confirm) return 'Konfirmasi kata sandi tidak sama.';
    return null;
  };

  const openAwareness = () => {
    const issue = validate();
    if (issue) {
      setError(issue);
      return;
    }
    setError(null);
    setShowAwareness(true);
  };

  const runSignup = async () => {
    setBusy(true);
    try {
      const result = await createAccount({ email, password });
      if (await isBiometricSupported()) {
        try {
          await enrollBiometric({
            userId: result.userId,
            email: result.email,
            vaultId: result.vaultId,
          });
        } catch (bioErr) {
          // Biometric enrollment is optional; warn in logs but don't block signup.
          console.warn('[gembok] biometric enrollment failed:', bioErr);
        }
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
      console.error('[gembok] signup failed:', e);
      const raw = e instanceof Error ? e.message : String(e);
      setError(`${authErrorMessage(e)} [${raw}]`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <NeoScreen scroll>
      <View style={{ gap: 4 }}>
        <NeoText variant="display">Buat Akun</NeoText>
        <NeoText color={theme.colors.muted}>Siapkan brankas baru Anda.</NeoText>
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
          <SecretInput
            label="Kata sandi utama"
            value={password}
            onChangeText={setPassword}
            placeholder="Minimal 10 karakter"
            hint="Kata sandi ini tidak dapat kami pulihkan. Ingat baik-baik."
          />
          <SecretInput
            label="Ulangi kata sandi"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Ulangi kata sandi"
          />
        </View>
      </NeoCard>

      {error ? <NeoNotice title="Gagal daftar" message={error} /> : null}

      <View style={{ gap: 12 }}>
        <NeoButton
          title="Buat akun"
          fullWidth
          loading={busy}
          onPress={openAwareness}
        />
        <NeoButton
          title="Kembali"
          variant="surface"
          fullWidth
          onPress={() => router.back()}
        />
      </View>

      {showAwareness ? (
        <AwarenessModal
          visible
          onCancel={() => setShowAwareness(false)}
          onComplete={() => {
            setShowAwareness(false);
            runSignup();
          }}
        />
      ) : null}

      <NeoLoadingOverlay visible={busy} message="Menyiapkan brankas..." />
    </NeoScreen>
  );
}
