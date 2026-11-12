import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../ThemeProvider';
import { NeoButton, type NeoButtonProps } from './NeoButton';
import { NeoModal } from './NeoModal';
import { NeoText } from './NeoText';

export type NeoConfirmModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: NeoButtonProps['variant'];
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  accent?: string;
};

// Neobrutalist confirmation modal with cancel and confirm actions.
export function NeoConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Lanjutkan',
  cancelLabel = 'Batal',
  confirmVariant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
  accent,
}: NeoConfirmModalProps) {
  const theme = useTheme();

  return (
    <NeoModal
      visible={visible}
      onRequestClose={loading ? undefined : onCancel}
      dismissable={!loading}
      accent={accent ?? (confirmVariant === 'danger' ? theme.colors.danger : theme.colors.primary)}
    >
      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.sm }}>
          <NeoText variant="title">{title}</NeoText>
          {message ? (
            <NeoText color={theme.colors.muted}>{message}</NeoText>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <NeoButton
            title={cancelLabel}
            variant="surface"
            disabled={loading}
            style={{ flex: 1 }}
            onPress={onCancel}
          />
          <NeoButton
            title={confirmLabel}
            variant={confirmVariant}
            loading={loading}
            style={{ flex: 1 }}
            onPress={onConfirm}
          />
        </View>
      </View>
    </NeoModal>
  );
}
