import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  NeoButton,
  NeoCard,
  NeoInput,
  NeoNotice,
  NeoTag,
  NeoText,
  useTheme,
} from '@/theme';
import { parseOtpAuthUri, type TotpAlgorithm } from '@/totp/totp';
import type { VaultItem, VaultItemDraft } from '@/vault/models';

import { OptionPicker } from '../vault/OptionPicker';
import { SecretInput } from '../vault/SecretInput';
import { QrScannerModal } from './QrScannerModal';
import { TotpCode } from './TotpCode';

export type AuthenticatorFormProps = {
  initial?: VaultItem;
  submitLabel: string;
  saving?: boolean;
  error?: string | null;
  onSubmit: (draft: VaultItemDraft) => void;
  onDelete?: () => void;
  deleting?: boolean;
};

type Method = 'choose' | 'manual';

function MethodCard({
  icon,
  title,
  caption,
  onPress,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  caption: string;
  onPress: () => void;
  accent: string;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress}>
      <NeoCard accent={accent}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderWidth: theme.border.width,
              borderColor: theme.colors.ink,
              borderRadius: theme.radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: accent,
            }}
          >
            <Ionicons name={icon} size={22} color={theme.colors.ink} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <NeoText variant="subtitle">{title}</NeoText>
            <NeoText variant="caption" color={theme.colors.muted}>
              {caption}
            </NeoText>
          </View>
        </View>
      </NeoCard>
    </Pressable>
  );
}

export function AuthenticatorForm({
  initial,
  submitLabel,
  saving,
  error,
  onSubmit,
  onDelete,
  deleting,
}: AuthenticatorFormProps) {
  const theme = useTheme();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [secret, setSecret] = useState(initial?.totpSecret ?? '');
  const [algorithm, setAlgorithm] = useState<TotpAlgorithm>(initial?.totpAlgorithm ?? 'SHA1');
  const [digits, setDigits] = useState(initial?.totpDigits ?? 6);
  const [period, setPeriod] = useState(initial?.totpPeriod ?? 30);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [method, setMethod] = useState<Method>(
    initial?.totpSecret || initial?.title ? 'manual' : 'choose',
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const handleScan = (data: string) => {
    setScannerVisible(false);
    try {
      const parsed = parseOtpAuthUri(data);
      setTitle((current) => current || parsed.issuer || parsed.account);
      setUsername(parsed.account);
      setSecret(parsed.secret);
      setAlgorithm(parsed.algorithm);
      setDigits(parsed.digits);
      setPeriod(parsed.period);
      setLocalError(null);
      setMethod('manual');
    } catch {
      setLocalError('Kode QR bukan kode 2FA yang didukung.');
    }
  };

  const submit = () => {
    if (!title.trim()) {
      setLocalError('Nama layanan tidak boleh kosong.');
      return;
    }
    if (!secret.trim()) {
      setLocalError('Kunci rahasia 2FA belum diisi.');
      return;
    }
    setLocalError(null);
    onSubmit({
      type: 'totp',
      title,
      username,
      totpSecret: secret,
      totpAlgorithm: algorithm,
      totpDigits: digits,
      totpPeriod: period,
      notes,
    });
  };

  if (method === 'choose') {
    return (
      <View style={{ gap: theme.spacing.lg }}>
        <NeoText color={theme.colors.muted}>
          Pilih cara menambahkan akun Authenticator.
        </NeoText>

        <MethodCard
          icon="qr-code-outline"
          title="Scan kode QR"
          caption="Paling cepat. Arahkan kamera ke kode QR dari layanan."
          accent={theme.colors.primary}
          onPress={() => setScannerVisible(true)}
        />
        <MethodCard
          icon="keypad-outline"
          title="Masukkan manual"
          caption="Ketik kunci rahasia (base32) yang diberikan layanan."
          accent={theme.colors.blue}
          onPress={() => setMethod('manual')}
        />

        {error || localError ? (
          <NeoNotice title="Tidak bisa dilanjutkan" message={error ?? localError ?? ''} />
        ) : null}

        {scannerVisible ? (
          <QrScannerModal onClose={() => setScannerVisible(false)} onScan={handleScan} />
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <NeoCard>
        <View style={{ gap: 16 }}>
          {secret.trim() ? (
            <View style={{ gap: 8 }}>
              <NeoTag label="KODE SAAT INI" color={theme.colors.red} />
              <TotpCode
                secret={secret}
                algorithm={algorithm}
                digits={digits}
                period={period}
                copyable
              />
            </View>
          ) : null}

          <NeoInput
            label="Nama layanan"
            value={title}
            onChangeText={setTitle}
            placeholder="Contoh: Google"
            autoCorrect={false}
          />
          <NeoInput
            label="Akun (opsional)"
            value={username}
            onChangeText={setUsername}
            placeholder="nama@contoh.com"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <SecretInput
            label="Kunci rahasia (base32)"
            value={secret}
            onChangeText={setSecret}
            placeholder="Contoh: JBSWY3DPEHPK3PXP"
          />
          <OptionPicker
            label="Algoritma"
            value={algorithm}
            onChange={setAlgorithm}
            options={[
              { value: 'SHA1', label: 'SHA1' },
              { value: 'SHA256', label: 'SHA256' },
              { value: 'SHA512', label: 'SHA512' },
            ]}
          />
          <OptionPicker
            label="Jumlah digit"
            value={digits}
            onChange={setDigits}
            options={[
              { value: 6, label: '6 digit' },
              { value: 8, label: '8 digit' },
            ]}
          />
          <OptionPicker
            label="Masa berlaku kode"
            value={period}
            onChange={setPeriod}
            options={[
              { value: 30, label: '30 detik' },
              { value: 60, label: '60 detik' },
            ]}
          />
          <NeoInput
            label="Catatan (opsional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Catatan tambahan"
            multiline
            numberOfLines={4}
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />
        </View>
      </NeoCard>

      {error || localError ? (
        <NeoNotice title="Tidak bisa disimpan" message={error ?? localError ?? ''} />
      ) : null}

      <NeoButton
        title="Scan QR lagi"
        variant="surface"
        fullWidth
        onPress={() => setScannerVisible(true)}
      />

      <View style={{ gap: 12 }}>
        <NeoButton title={submitLabel} fullWidth loading={saving} onPress={submit} />
        {onDelete ? (
          <NeoButton
            title="Hapus"
            variant="danger"
            fullWidth
            loading={deleting}
            onPress={onDelete}
          />
        ) : null}
      </View>

      <NeoText variant="caption" color={theme.colors.muted}>
        Kode dibuat di perangkat Anda. Kunci rahasia tidak pernah dikirim keluar.
      </NeoText>

      {scannerVisible ? (
        <QrScannerModal onClose={() => setScannerVisible(false)} onScan={handleScan} />
      ) : null}
    </View>
  );
}
