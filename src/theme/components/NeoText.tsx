import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '../ThemeProvider';

type Variant = 'display' | 'title' | 'subtitle' | 'body' | 'label' | 'caption';

export type NeoTextProps = TextProps & {
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
};

const sizeFor: Record<Variant, number> = {
  display: 34,
  title: 26,
  subtitle: 20,
  body: 16,
  label: 14,
  caption: 12,
};

export function NeoText({
  variant = 'body',
  color,
  align,
  style,
  ...rest
}: NeoTextProps) {
  const theme = useTheme();
  const isDisplay = variant === 'display';
  const isEmphasis = variant === 'title' || variant === 'subtitle';

  return (
    <Text
      {...rest}
      style={[
        {
          color: color ?? theme.colors.ink,
          fontSize: sizeFor[variant],
          lineHeight: sizeFor[variant] * 1.25,
          fontFamily: isDisplay
            ? theme.fonts.display
            : isEmphasis
              ? theme.fonts.uiBold
              : variant === 'caption'
                ? theme.fonts.uiMedium
                : theme.fonts.ui,
          letterSpacing: isDisplay ? -0.5 : 0,
          textAlign: align,
        },
        style,
      ]}
    />
  );
}
