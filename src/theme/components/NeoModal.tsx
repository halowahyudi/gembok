import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../ThemeProvider';

export type NeoModalProps = {
  visible: boolean;
  children: React.ReactNode;
  onRequestClose?: () => void;
  // Tap the backdrop to close, when enabled.
  dismissable?: boolean;
  accent?: string;
};

// Bottom-sheet modal, neobrutalist borders.
export function NeoModal({
  visible,
  children,
  onRequestClose,
  dismissable = false,
  accent,
}: NeoModalProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(17,17,17,0.55)' }}>
        {dismissable ? (
          <Pressable style={{ flex: 1 }} onPress={onRequestClose} />
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <SafeAreaView edges={['bottom']}>
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderTopWidth: theme.border.width,
              borderColor: theme.colors.ink,
              borderTopLeftRadius: theme.radius.sm,
              borderTopRightRadius: theme.radius.sm,
              overflow: 'hidden',
            }}
          >
            {accent ? <View style={{ height: 8, backgroundColor: accent }} /> : null}
            {children}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
