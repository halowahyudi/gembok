import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../ThemeProvider';

export type NeoCardProps = {
  children: React.ReactNode;
  accent?: string;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function NeoCard({ children, accent, padded = true, style }: NeoCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.ink,
          borderWidth: theme.border.width,
          borderRadius: theme.radius.sm,
          padding: padded ? theme.spacing.lg : 0,
          paddingTop: padded && accent ? theme.spacing.xl : padded ? theme.spacing.lg : 0,
          shadowColor: theme.colors.ink,
          shadowOffset: { width: theme.shadow.offsetSm, height: theme.shadow.offsetSm },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 0,
        },
        style,
      ]}
    >
      {accent ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            backgroundColor: accent,
            borderTopLeftRadius: theme.radius.sm,
            borderTopRightRadius: theme.radius.sm,
          }}
        />
      ) : null}
      {children}
    </View>
  );
}
