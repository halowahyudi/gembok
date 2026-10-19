import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../ThemeProvider';
import { NeoText } from './NeoText';

type Variant = 'danger' | 'info' | 'success';

export type NeoNoticeProps = {
  message: string;
  title?: string;
  variant?: Variant;
};

// Inline notice: bold color block with a small badge, no gradients or glows.
export function NeoNotice({ message, title, variant = 'danger' }: NeoNoticeProps) {
  const theme = useTheme();
  const background =
    variant === 'danger'
      ? theme.colors.danger
      : variant === 'success'
        ? theme.colors.green
        : theme.colors.blue;

  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        gap: theme.spacing.md,
        alignItems: 'flex-start',
        backgroundColor: background,
        borderWidth: theme.border.width,
        borderColor: theme.colors.ink,
        borderRadius: theme.radius.sm,
        padding: theme.spacing.md,
        shadowColor: theme.colors.ink,
        shadowOffset: { width: theme.shadow.offsetSm, height: theme.shadow.offsetSm },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0,
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderWidth: 2,
          borderColor: theme.colors.ink,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <NeoText variant="label" color={theme.colors.surface}>
          !
        </NeoText>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <NeoText variant="label" style={{ fontFamily: theme.fonts.uiBold }}>
            {title}
          </NeoText>
        ) : null}
        <NeoText>{message}</NeoText>
      </View>
    </View>
  );
}
