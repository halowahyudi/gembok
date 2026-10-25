import * as Clipboard from 'expo-clipboard';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Share, View } from 'react-native';

import { vaultErrorMessage } from '@/auth/errors';
import { QrCode } from '@/features/totp/QrCode';
import { QrScannerModal } from '@/features/totp/QrScannerModal';
import { newId } from '@/lib/id';
import { useSessionStore } from '@/store/session';
import { NeoButton, NeoCard, NeoInput, NeoNotice, NeoScreen, NeoText, useTheme } from '@/theme';
import {
  buildOtpAuthUri,
  exportAuthenticatorText,
  parseAuthenticatorImport,
} from '@/totp/exchange';
import { buildItem } from '@/vault/models';
import { supabaseVaultRepository } from '@/vault/repository';
import { useVaultStore } from '@/vault/store';

type Status = { variant: 'success' | 'danger' | 'info'; message: string };

type Row = { key: string; title: string; subtitle: string };

// Checklist used by both export and import. `off` holds the unchecked keys, so
// anything new defaults to checked.
function CheckList({
  rows,
  off,
  onChange,
}: {
  rows: Row[];
  off: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const theme = useTheme();
  const allChecked = rows.every((r) => !off.has(r.key));

  const toggle = (key: string) => {
    const next = new Set(off);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <NeoButton
        title={allChecked ? 'Kosongkan pilihan' : 'Pilih semua'}
        size="sm"
        variant="surface"
        onPress={() => onChange(allChecked ? new Set(rows.map((r) => r.key)) : new Set())}
      />
      {rows.map((row) => {
        const checked = !off.has(row.key);
        return (
          <Pressable
            key={row.key}
            onPress={() => toggle(row.key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderWidth: theme.border.width,
                borderColor: theme.colors.ink,
                borderRadius: theme.radius.sm,
                backgroundColor: checked ? theme.colors.primary : theme.colors.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {checked ? <NeoText variant="subtitle">✓</NeoText> : null}
            </View>
            <View style={{ flex: 1 }}>
              <NeoText>{row.title}</NeoText>
              {row.subtitle ? (
                <NeoText variant="caption" color={theme.colors.muted}>
                  {row.subtitle}
                </NeoText>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AuthenticatorTransfer() {
  const theme = useTheme();
  const router = useRouter();
  const unlocked = useSessionStore((s) => s.unlocked);
  const userId = useSessionStore((s) => s.userId);
  const vaultId = useSessionStore((s) => s.vaultId);
  const entries = useVaultStore((s) => s.entries);
  const upsert = useVaultStore((s) => s.upsert);

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [scanning, setScanning] = useState(false);
  const [qrIndex, setQrIndex] = useState<number | null>(null);
  const [exportOff, setExportOff] = useState<Set<string>>(new Set());
  const [importOff, setImportOff] = useState<Set<string>>(new Set());

  const totpItems = useMemo(
    () => entries.map((e) => e.item).filter((i) => i.type === 'totp' && i.totpSecret),
    [entries],
  );
  const selectedItems = useMemo(
    () => totpItems.filter((i) => !exportOff.has(i.id)),
    [totpItems, exportOff],
  );
  const exportRows = useMemo<Row[]>(
    () =>
      totpItems.map((i) => ({ key: i.id, title: i.title, subtitle: i.username })),
    [totpItems],
  );

  const parsed = useMemo(
    () => parseAuthenticatorImport(text, totpItems.map((i) => i.totpSecret)),
    [text, totpItems],
  );
  const importRows = useMemo<Row[]>(
    () =>
      parsed.drafts.map((d) => ({
        key: d.totpSecret ?? '',
        title: d.title,
        subtitle: d.username ?? '',
      })),
    [parsed],
  );
  const selectedDrafts = parsed.drafts.filter((d) => !importOff.has(d.totpSecret ?? ''));

  const updateExportSelection = (next: Set<string>) => {
    setExportOff(next);
    setQrIndex(null); // The QR code must always match the current selection.
  };

  const exportText = () => exportAuthenticatorText(selectedItems);

  const copyExport = async () => {
    await Clipboard.setStringAsync(exportText());
    setStatus({ variant: 'success', message: `${selectedItems.length} akun disalin.` });
  };

  const shareExport = async () => {
    try {
      await Share.share({ message: exportText() });
    } catch {
      setStatus({ variant: 'danger', message: 'Gagal membagikan data.' });
    }
  };

  const handleScan = (data: string) => {
    setScanning(false);
    if (parseAuthenticatorImport(data).drafts.length === 0) {
      setStatus({ variant: 'danger', message: 'Kode QR bukan kode 2FA yang didukung.' });
      return;
    }
    setText((current) => (current.trim() ? `${current.trim()}\n${data.trim()}` : data.trim()));
    setStatus({
      variant: 'info',
      message: 'Akun ditambahkan ke daftar. Pindai lagi atau pilih akun lalu tekan Impor.',
    });
  };

  const paste = async () => {
    setText(await Clipboard.getStringAsync());
  };

  const runImport = async () => {
    if (!userId || !vaultId) {
      setStatus({ variant: 'danger', message: 'Sesi tidak aktif. Buka brankas ulang.' });
      return;
    }
    if (selectedDrafts.length === 0) {
      setStatus({
        variant: 'danger',
        message:
          parsed.invalid > 0
            ? 'Tidak ada kode 2FA yang bisa dibaca. Pastikan satu kode per baris.'
            : parsed.duplicates > 0
              ? 'Semua akun sudah ada di Authenticator.'
              : 'Pilih minimal satu akun untuk diimpor.',
      });
      return;
    }

    setBusy(true);
    setStatus(null);
    let added = 0;
    try {
      for (const draft of selectedDrafts) {
        const item = buildItem(newId(), draft, new Date().toISOString());
        upsert(await supabaseVaultRepository.create({ userId, vaultId, item }));
        added += 1;
      }
      setText('');
      setImportOff(new Set());
      setStatus({ variant: 'success', message: `${added} akun ditambahkan.` });
    } catch (e) {
      setStatus({
        variant: 'danger',
        message: `${added} akun ditambahkan sebelum gagal. ${vaultErrorMessage(e)}`,
      });
    } finally {
      setBusy(false);
    }
  };

  const noneSelected = selectedItems.length === 0;
  const currentQr = qrIndex !== null ? selectedItems[qrIndex] : undefined;

  if (!unlocked) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <NeoScreen scroll>
      <View style={{ gap: 4 }}>
        <NeoText variant="display">Impor & Ekspor</NeoText>
        <NeoText color={theme.colors.muted}>
          Pindahkan kode 2FA dari atau ke aplikasi Authenticator lain.
        </NeoText>
      </View>

      {status ? <NeoNotice variant={status.variant} message={status.message} /> : null}

      <NeoCard>
        <View style={{ gap: theme.spacing.md }}>
          <NeoText variant="subtitle">Ekspor</NeoText>
          <NeoText color={theme.colors.muted}>
            Hasil ekspor tidak dilindungi sandi. Siapa pun yang memegangnya bisa membuat kode
            2FA Anda, jadi simpan dengan hati-hati dan hapus setelah dipakai.
          </NeoText>
          {totpItems.length === 0 ? (
            <NeoText color={theme.colors.muted}>Belum ada akun untuk diekspor.</NeoText>
          ) : (
            <>
              <NeoText variant="label">Pilih akun yang diekspor</NeoText>
              <CheckList rows={exportRows} off={exportOff} onChange={updateExportSelection} />
            </>
          )}
          <NeoButton
            title={`Salin ${selectedItems.length} akun`}
            fullWidth
            disabled={noneSelected}
            onPress={copyExport}
          />
          <NeoButton
            title="Bagikan"
            variant="surface"
            fullWidth
            disabled={noneSelected}
            onPress={shareExport}
          />
          <NeoButton
            title={qrIndex === null ? 'Tampilkan kode QR' : 'Sembunyikan kode QR'}
            variant="surface"
            fullWidth
            disabled={noneSelected}
            onPress={() => setQrIndex((i) => (i === null ? 0 : null))}
          />
          {currentQr && qrIndex !== null ? (
            <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
              <QrCode value={buildOtpAuthUri(currentQr)} />
              <NeoText variant="subtitle">{currentQr.title}</NeoText>
              <NeoText variant="caption" color={theme.colors.muted}>
                {qrIndex + 1} dari {selectedItems.length}. Pindai dengan aplikasi Authenticator
                lain.
              </NeoText>
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                <NeoButton
                  title="Sebelumnya"
                  size="sm"
                  variant="surface"
                  style={{ flex: 1 }}
                  disabled={qrIndex === 0}
                  onPress={() => setQrIndex(qrIndex - 1)}
                />
                <NeoButton
                  title="Berikutnya"
                  size="sm"
                  variant="surface"
                  style={{ flex: 1 }}
                  disabled={qrIndex >= selectedItems.length - 1}
                  onPress={() => setQrIndex(qrIndex + 1)}
                />
              </View>
            </View>
          ) : null}
        </View>
      </NeoCard>

      <NeoCard>
        <View style={{ gap: theme.spacing.md }}>
          <NeoText variant="subtitle">Impor</NeoText>
          <NeoText color={theme.colors.muted}>
            Pindai kode QR ekspor (termasuk dari Google Authenticator), atau tempel kode 2FA
            (diawali otpauth:// atau otpauth-migration://). Akun yang sudah ada dilewati.
          </NeoText>
          <NeoInput
            value={text}
            onChangeText={setText}
            placeholder="otpauth://totp/... atau otpauth-migration://..."
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            style={{ minHeight: 120, textAlignVertical: 'top' }}
          />
          <NeoButton
            title="Pindai kode QR"
            variant="surface"
            fullWidth
            onPress={() => setScanning(true)}
          />
          <NeoButton title="Tempel dari salinan" variant="surface" fullWidth onPress={paste} />

          {text.trim() ? (
            <>
              {importRows.length > 0 ? (
                <>
                  <NeoText variant="label">Pilih akun yang diimpor</NeoText>
                  <CheckList rows={importRows} off={importOff} onChange={setImportOff} />
                </>
              ) : null}
              {parsed.duplicates > 0 || parsed.invalid > 0 ? (
                <NeoText variant="caption" color={theme.colors.muted}>
                  {[
                    parsed.duplicates > 0 ? `${parsed.duplicates} sudah ada` : '',
                    parsed.invalid > 0 ? `${parsed.invalid} tidak terbaca` : '',
                  ]
                    .filter(Boolean)
                    .join(', ')}
                  .
                </NeoText>
              ) : null}
            </>
          ) : null}

          <NeoButton
            title={busy ? 'Mengimpor...' : `Impor ${selectedDrafts.length} akun`}
            fullWidth
            disabled={busy || selectedDrafts.length === 0}
            onPress={runImport}
          />
        </View>
      </NeoCard>

      <NeoButton title="Kembali" variant="surface" fullWidth onPress={() => router.back()} />

      {scanning ? (
        <QrScannerModal onClose={() => setScanning(false)} onScan={handleScan} />
      ) : null}
    </NeoScreen>
  );
}
