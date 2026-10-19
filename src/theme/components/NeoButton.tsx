import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../ThemeProvider';
import { NeoText } from './NeoText';

type Variant = 'primary' | 'surface' | 'danger' | 'success' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export type NeoButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const paddingFor: Record<Size, { v: number; h: number; font: number }> = {
  sm: { v: 8, h: 12, font: 13 },
  md: { v: 12, h: 18, font: 15 },
  lg: { v: 16, h: 22, font: 17 },
};

export function NeoButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  left,
  right,
  style,
}: NeoButtonProps) {
  const theme = useTheme();
  const pad = paddingFor[size];

  const background: Record<Variant, string> = {
    primary: theme.colors.primary,
    surface: theme.colors.surface,
    danger: theme.colors.danger,
    success: theme.colors.success,
    ghost: 'transparent',
  };

  const textColor =
    variant === 'danger' || variant === 'success' ? '#111111' : theme.colors.ink;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => {
        const lift = pressed ? 0 : theme.shadow.offset;
        const drop = pressed ? theme.shadow.offset : 0;
        return [
          styles.base,
          {
            backgroundColor: background[variant],
            borderColor: theme.colors.ink,
            borderWidth: theme.border.width,
            borderRadius: theme.radius.sm,
            paddingVertical: pad.v,
            paddingHorizontal: pad.h,
            width: fullWidth ? '100%' : undefined,
            opacity: disabled ? 0.5 : 1,
            transform: [{ translateX: drop }, { translateY: drop }],
            shadowColor: theme.colors.ink,
            shadowOffset: { width: lift, height: lift },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 0,
          },
          style,
        ];
      }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {left}
          <NeoText
            variant="subtitle"
            color={textColor}
            style={{ fontSize: pad.font }}
          >
            {title}
          </NeoText>
          {right}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
