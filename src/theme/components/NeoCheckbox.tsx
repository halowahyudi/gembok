import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../ThemeProvider';
import { NeoText } from './NeoText';

export type NeoCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
};

export function NeoCheckbox({ checked, onChange, label }: NeoCheckboxProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.md,
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderWidth: theme.border.width,
          borderColor: theme.colors.ink,
          borderRadius: theme.radius.sm,
          backgroundColor: checked ? theme.colors.primary : theme.colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? (
          <View
            style={{
              width: 12,
              height: 12,
              backgroundColor: theme.colors.ink,
            }}
          />
        ) : null}
      </View>
      {label ? (
        <NeoText style={{ flex: 1 }} variant="body">
          {label}
        </NeoText>
      ) : null}
    </Pressable>
  );
}
