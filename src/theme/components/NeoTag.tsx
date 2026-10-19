import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../ThemeProvider';
import { NeoText } from './NeoText';

export type NeoTagProps = {
  label: string;
  color?: string;
  textColor?: string;
};

export function NeoTag({ label, color, textColor }: NeoTagProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: color ?? theme.colors.primary,
        borderColor: theme.colors.ink,
        borderWidth: 2,
        borderRadius: theme.radius.sm,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
      }}
    >
      <NeoText variant="caption" color={textColor ?? '#111111'}>
        {label}
      </NeoText>
    </View>
  );
}
