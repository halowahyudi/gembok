export const palette = {
  ink: '#111111',
  paper: '#FFFDF5',
  surface: '#FFFFFF',
  primary: '#FFD23F',
  red: '#FF6B6B',
  blue: '#4D96FF',
  green: '#3DDC97',
  purple: '#B983FF',
  danger: '#FF4D4D',
  success: '#2ECC71',
  muted: '#6B6456',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  none: 0,
  sm: 4,
} as const;

export const border = {
  width: 3,
} as const;

export const shadow = {
  offset: 4,
  offsetSm: 2,
  pressed: 1,
} as const;

export const fonts = {
  ui: 'SpaceGrotesk_400Regular',
  uiMedium: 'SpaceGrotesk_500Medium',
  uiBold: 'SpaceGrotesk_700Bold',
  display: 'ArchivoBlack_400Regular',
} as const;

export type NeoColors = {
  ink: string;
  bg: string;
  surface: string;
  primary: string;
  red: string;
  blue: string;
  green: string;
  purple: string;
  danger: string;
  success: string;
  muted: string;
};

export type NeoTheme = {
  colors: NeoColors;
  spacing: typeof spacing;
  radius: typeof radius;
  border: typeof border;
  shadow: typeof shadow;
  fonts: typeof fonts;
};

const colors: NeoColors = {
  ink: palette.ink,
  bg: palette.paper,
  surface: palette.surface,
  primary: palette.primary,
  red: palette.red,
  blue: palette.blue,
  green: palette.green,
  purple: palette.purple,
  danger: palette.danger,
  success: palette.success,
  muted: palette.muted,
};

// Light theme only, on purpose.
export const lightTheme: NeoTheme = { colors, spacing, radius, border, shadow, fonts };
