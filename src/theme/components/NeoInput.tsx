import React, { useState } from 'react';
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { useTheme } from '../ThemeProvider';
import { NeoText } from './NeoText';

export type NeoInputProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function NeoInput({
  label,
  hint,
  error,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: NeoInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.blue
      : theme.colors.ink;

  return (
    <View style={[{ gap: theme.spacing.xs }, containerStyle]}>
      {label ? (
        <NeoText variant="label" style={{ fontFamily: theme.fonts.uiBold }}>
          {label}
        </NeoText>
      ) : null}
      <TextInput
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        placeholderTextColor={theme.colors.muted}
        style={[
          {
            backgroundColor: theme.colors.surface,
            color: theme.colors.ink,
            borderColor,
            borderWidth: theme.border.width,
            borderRadius: theme.radius.sm,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.md,
            fontFamily: theme.fonts.uiMedium,
            fontSize: 16,
            shadowColor: theme.colors.ink,
            shadowOffset: {
              width: theme.shadow.offsetSm,
              height: theme.shadow.offsetSm,
            },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 0,
          },
          style,
        ]}
      />
      {error ? (
        <NeoText variant="caption" color={theme.colors.danger}>
          {error}
        </NeoText>
      ) : hint ? (
        <NeoText variant="caption" color={theme.colors.muted}>
          {hint}
        </NeoText>
      ) : null}
    </View>
  );
}
