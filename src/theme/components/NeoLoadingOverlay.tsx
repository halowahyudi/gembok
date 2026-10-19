import React from 'react';
import { ActivityIndicator, Modal, View } from 'react-native';

import { useTheme } from '../ThemeProvider';
import { NeoText } from './NeoText';

export type NeoLoadingOverlayProps = {
  visible: boolean;
  message: string;
  // Progress from 0..1. Shows a bar instead of a spinner when set.
  progress?: number;
};

// Full-screen overlay for long operations (Argon2, mostly).
export function NeoLoadingOverlay({ visible, message, progress }: NeoLoadingOverlayProps) {
  const theme = useTheme();
  const hasProgress = typeof progress === 'number';
  const clamped = hasProgress ? Math.max(0, Math.min(1, progress)) : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(17,17,17,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing.xl,
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderWidth: theme.border.width,
            borderColor: theme.colors.ink,
            borderRadius: theme.radius.sm,
            padding: theme.spacing.xl,
            gap: theme.spacing.lg,
            alignItems: 'center',
            minWidth: 260,
            shadowColor: theme.colors.ink,
            shadowOffset: { width: theme.shadow.offset, height: theme.shadow.offset },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 0,
          }}
        >
          {hasProgress ? (
            <View style={{ width: 200, gap: theme.spacing.sm, alignItems: 'center' }}>
              <View
                style={{
                  width: '100%',
                  height: 22,
                  borderWidth: theme.border.width,
                  borderColor: theme.colors.ink,
                  borderRadius: theme.radius.sm,
                  backgroundColor: theme.colors.surface,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${clamped * 100}%`,
                    height: '100%',
                    backgroundColor: theme.colors.primary,
                  }}
                />
              </View>
              <NeoText variant="label">{Math.round(clamped * 100)}%</NeoText>
            </View>
          ) : (
            <ActivityIndicator size="large" color={theme.colors.ink} />
          )}

          <NeoText variant="subtitle" align="center">
            {message}
          </NeoText>
          <NeoText variant="caption" align="center" color={theme.colors.muted}>
            Ini bisa butuh beberapa detik. Jangan tutup aplikasi.
          </NeoText>
        </View>
      </View>
    </Modal>
  );
}
