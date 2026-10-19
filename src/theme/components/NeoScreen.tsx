import React from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../ThemeProvider';

export type NeoScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function NeoScreen({
  children,
  scroll,
  padded = true,
  style,
  contentStyle,
}: NeoScreenProps) {
  const theme = useTheme();
  const padding = padded ? theme.spacing.lg : 0;

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: theme.colors.bg }, style]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ padding, gap: theme.spacing.lg }, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, padding, gap: theme.spacing.lg }, contentStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
