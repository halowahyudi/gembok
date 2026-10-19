import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { changePassword } from '@/auth/account';
import { authErrorMessage } from '@/auth/errors';
import { formatSecretKeyInput } from '@/auth/emergency-kit';
import { clearBiometric, enrollBiometric, isBiometricSupported } from '@/device/biometric';
import { SecretInput } from '@/features/vault/SecretInput';
import { MIN_MASTER_PASSWORD_LENGTH, masterPasswordIssue } from '@/lib/validation';
import { useOnboardingStore } from '@/store/onboarding';
import { useSessionStore } from '@/store/session';
import {
  NeoButton,
  NeoCard,
  NeoCheckbox,
  NeoInput,
  NeoLoadingOverlay,
  NeoModal,
  NeoNotice,
  NeoScreen,
  NeoText,
  useTheme,
} from '@/theme';

export default function ChangePasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const setEmergencyKit = useOnboardingStore((s) => s.setEmergencyKit);
  const userId = useSessionStore((s) => s.userId);
  const email = useSessionStore((s) => s.email);
  const vaultId = useSessionStore((s) => s.vaultId);

  const [currentPassword, setCurrentPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [newSecretKey, setNewSecretKey] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validate = (): string | null => {
    if (!currentPassword) return 'Masukkan kata sandi saat ini.';
    if (!secretKey.trim()) return 'Masukkan Kunci Keamanan saat ini.';
    if (newPassword.length < MIN_MASTER_PASSWORD_LENGTH) {
      return `Kata sandi baru minimal ${MIN_MASTER_PASSWORD_LENGTH} karakter.`;
    }
    const issue = masterPasswordIssue(newPassword);
    if (issue === 'TOO_SIMPLE') return 'Gunakan kombinasi huruf dan angka atau simbol.';
    if (newPassword !== confirm) return 'Konfirmasi kata sandi tidak sama.';
    if (newPassword === currentPassword) return 'Kata sandi baru harus berbeda dari yang saat ini.';
    return null;
  };

  const submit = () => {
    setError(null);
    const issue = validate();
    if (issue) {
      setError(issue);
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    setBusy(true);
    try {
      const result = await changePassword({
        currentPassword,
        secretKey,
        newPassword,
        newSecretKey,
      });

      // Re-enroll biometrics because the wrapped device key is now invalid.
      if (await isBiometricSupported()) {
        try {
          await clearBiometric();
          if (userId && email && vaultId) {
            await enrollBiometric({ userId, email, vaultId });
          }
        } catch (bioErr) {
          console.warn('[gembok] biometric re-enrollment failed:', bioErr);
        }
      }

      setEmergencyKit({
        email: email ?? '',
        secretKey: result.secretKey,
        recoveryMnemonic: '', // recovery phrase does not change.
      });
      setSuccess(true);
    } catch (e) {
      console.error('[gembok] change password failed:', e);
      const raw = e instanceof Error ? e.message : String(e);
      setError(`${authErrorMessage(e)} [${raw}]`);
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    router.replace('/emergency-kit');
  };

  return (
    <NeoScreen scroll>
      <View style={{ gap: 4 }}>
        <NeoText variant="display">Ganti Kata Sandi</NeoText>
        <NeoText color={theme.colors.muted}>
          Ubah kata sandi utama dan Kunci Keamanan baru.
        </NeoText>
      </View>

      {success ? (
        <NeoCard accent={theme.colors.green}>
          <View style={{ gap: 12 }}>
            <NeoText variant="title" color={theme.colors.green}>
              Berhasil
            </NeoText>
            <NeoText>
              Kata sandi dan Kunci Keamanan sudah diperbarui. Simpan Kunci Keamanan baru
              dari Kit Darurat berikutnya.
            </NeoText>
            <NeoButton title="Lihat Kit Darurat" fullWidth onPress={finish} />
          </View>
        </NeoCard>
      ) : (
        <>
          <NeoCard>
            <View style={{ gap: 16 }}>
              <SecretInput
                label="Kata sandi saat ini"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Kata sandi utama Anda"
              />
              <NeoInput
                label="Kunci Keamanan saat ini"
                value={secretKey}
                onChangeText={(value) => setSecretKey(formatSecretKeyInput(value))}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <SecretInput
                label="Kata sandi baru"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Minimal 10 karakter"
              />
              <SecretInput
                label="Ulangi kata sandi baru"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Ulangi kata sandi baru"
              />
            </View>
          </NeoCard>

          <NeoCard accent={theme.colors.blue}>
            <NeoCheckbox
              checked={newSecretKey}
              onChange={setNewSecretKey}
              label="Ganti Kunci Keamanan juga (disarankan jika Kunci Keamanan mungkin sudah bocor)."
            />
          </NeoCard>

          {error ? <NeoNotice title="Gagal mengganti kata sandi" message={error} /> : null}

          <View style={{ gap: 12 }}>
            <NeoButton title="Simpan" fullWidth loading={busy} onPress={submit} />
            <NeoButton
              title="Batal"
              variant="surface"
              fullWidth
              onPress={() => router.back()}
            />
          </View>
        </>
      )}

      <NeoModal
        visible={showConfirm}
        onRequestClose={() => setShowConfirm(false)}
        accent={theme.colors.danger}
      >
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
          <NeoText variant="title">Yakin ingin mengganti kata sandi?</NeoText>
          <NeoText>
            Setelah ini, Kunci Keamanan {newSecretKey ? 'lama tidak bisa dipakai lagi' : 'tetap sama, tapi disarankan menyimpannya kembali'}. Pastikan Anda sudah mencatat yang benar.
          </NeoText>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <NeoButton
              title="Batal"
              variant="surface"
              style={{ flex: 1 }}
              onPress={() => setShowConfirm(false)}
            />
            <NeoButton
              title="Lanjutkan"
              style={{ flex: 1 }}
              onPress={confirmSubmit}
            />
          </View>
        </View>
      </NeoModal>

      <NeoLoadingOverlay visible={busy} message="Memperbarui kata sandi..." />
    </NeoScreen>
  );
}
