import { useState } from 'react';
import { View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';

import { NeoButton, NeoInput, useTheme } from '@/theme';

export type SecretInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  hint?: string;
};

// Password-style input with a show/hide toggle. Used for password, PIN, CVV.
export function SecretInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  hint,
}: SecretInputProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <NeoInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={!visible}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        hint={hint}
      />
      <NeoButton
        title={visible ? 'Sembunyikan' : 'Lihat'}
        variant="surface"
        size="sm"
        onPress={() => setVisible((current) => !current)}
      />
    </View>
  );
}
