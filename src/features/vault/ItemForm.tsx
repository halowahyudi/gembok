import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  NeoButton,
  NeoCard,
  NeoInput,
  NeoNotice,
  NeoText,
  useTheme,
} from '@/theme';
import type { VaultItem, VaultItemDraft, VaultItemType } from '@/vault/models';

import { ITEM_TYPE_COLOR, ITEM_TYPE_LABEL } from './itemTypes';
import { SecretInput } from './SecretInput';

const PASSWORD_TYPES: VaultItemType[] = ['login', 'pin', 'card', 'note'];

export type ItemFormProps = {
  type: VaultItemType;
  // Show the type picker when this is set (only when creating).
  onTypeChange?: (type: VaultItemType) => void;
  initial?: VaultItem;
  submitLabel: string;
  saving?: boolean;
  error?: string | null;
  onSubmit: (draft: VaultItemDraft) => void;
  onDelete?: () => void;
  deleting?: boolean;
};

export function ItemForm({
  type,
  onTypeChange,
  initial,
  submitLabel,
  saving,
  error,
  onSubmit,
  onDelete,
  deleting,
}: ItemFormProps) {
  const theme = useTheme();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [pin, setPin] = useState(initial?.pin ?? '');
  const [cardHolder, setCardHolder] = useState(initial?.cardHolder ?? '');
  const [cardNumber, setCardNumber] = useState(initial?.cardNumber ?? '');
  const [cardExpiry, setCardExpiry] = useState(initial?.cardExpiry ?? '');
  const [cardCvv, setCardCvv] = useState(initial?.cardCvv ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = () => {
    if (!title.trim()) {
      setLocalError('Judul tidak boleh kosong.');
      return;
    }
    setLocalError(null);
    onSubmit({
      type,
      title,
      username,
      password,
      url,
      pin,
      cardHolder,
      cardNumber,
      cardExpiry,
      cardCvv,
      notes,
    });
  };

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {onTypeChange ? (
        <View style={{ gap: theme.spacing.sm }}>
          <NeoText variant="label">Jenis</NeoText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {PASSWORD_TYPES.map((option) => {
              const active = option === type;
              return (
                <Pressable key={option} onPress={() => onTypeChange(option)}>
                  <View
                    style={{
                      borderWidth: theme.border.width,
                      borderColor: theme.colors.ink,
                      borderRadius: theme.radius.sm,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                      backgroundColor: active
                        ? theme.colors[ITEM_TYPE_COLOR[option]]
                        : theme.colors.surface,
                    }}
                  >
                    <NeoText variant="label">{ITEM_TYPE_LABEL[option]}</NeoText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <NeoCard>
        <View style={{ gap: 16 }}>
          <NeoInput
            label="Judul"
            value={title}
            onChangeText={setTitle}
            placeholder="Contoh: Email pribadi"
            autoCorrect={false}
          />

          {type === 'login' ? (
            <>
              <NeoInput
                label="Username atau email"
                value={username}
                onChangeText={setUsername}
                placeholder="username, email, atau nomor"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <SecretInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
              />
              <NeoInput
                label="Alamat situs (opsional)"
                value={url}
                onChangeText={setUrl}
                placeholder="https://"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </>
          ) : null}

          {type === 'pin' ? (
            <SecretInput
              label="PIN"
              value={pin}
              onChangeText={setPin}
              placeholder="PIN"
              keyboardType="number-pad"
            />
          ) : null}

          {type === 'card' ? (
            <>
              <NeoInput
                label="Nama di kartu"
                value={cardHolder}
                onChangeText={setCardHolder}
                placeholder="Nama pemegang kartu"
                autoCorrect={false}
              />
              <NeoInput
                label="Nomor kartu"
                value={cardNumber}
                onChangeText={setCardNumber}
                placeholder="0000 0000 0000 0000"
                keyboardType="number-pad"
                autoCorrect={false}
              />
              <NeoInput
                label="Masa berlaku"
                value={cardExpiry}
                onChangeText={setCardExpiry}
                placeholder="MM/YY"
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
              />
              <SecretInput
                label="CVV"
                value={cardCvv}
                onChangeText={setCardCvv}
                placeholder="CVV"
                keyboardType="number-pad"
              />
              <SecretInput
                label="PIN kartu (opsional)"
                value={pin}
                onChangeText={setPin}
                placeholder="PIN"
                keyboardType="number-pad"
              />
            </>
          ) : null}

          <NeoInput
            label={type === 'note' ? 'Isi catatan' : 'Catatan (opsional)'}
            value={notes}
            onChangeText={setNotes}
            placeholder="Catatan tambahan"
            multiline
            numberOfLines={type === 'note' ? 8 : 4}
            style={{
              minHeight: type === 'note' ? 160 : 96,
              textAlignVertical: 'top',
            }}
          />
        </View>
      </NeoCard>

      {error || localError ? (
        <NeoNotice title="Tidak bisa disimpan" message={error ?? localError ?? ''} />
      ) : null}

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
        Data disimpan dalam bentuk teracak. Tidak ada yang bisa membacanya selain Anda.
      </NeoText>
    </View>
  );
}
