import { Pressable, View } from 'react-native';

import { NeoText, useTheme } from '@/theme';

export type OptionPickerProps<T extends string | number> = {
  label?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function OptionPicker<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: OptionPickerProps<T>) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {label ? <NeoText variant="label">{label}</NeoText> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable key={String(option.value)} onPress={() => onChange(option.value)}>
              <View
                style={{
                  borderWidth: theme.border.width,
                  borderColor: theme.colors.ink,
                  borderRadius: theme.radius.sm,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                }}
              >
                <NeoText variant="label">{option.label}</NeoText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
