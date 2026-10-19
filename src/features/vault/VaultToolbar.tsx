import { Pressable, View } from 'react-native';

import { NeoButton, NeoInput, NeoText, useTheme } from '@/theme';
import type { VaultCategory } from '@/vault/query';

export type VaultToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  category?: VaultCategory;
  onCategoryChange?: (value: VaultCategory) => void;
};

const CATEGORIES: { value: VaultCategory; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'password', label: 'Password' },
  { value: 'authenticator', label: 'Authenticator' },
];

export function VaultToolbar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
}: VaultToolbarProps) {
  const theme = useTheme();
  const showCategories = category !== undefined && onCategoryChange !== undefined;

  return (
    <View style={{ gap: theme.spacing.md }}>
      <NeoInput
        value={query}
        onChangeText={onQueryChange}
        placeholder="Cari judul, username, atau catatan"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />

      {showCategories ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {CATEGORIES.map((option) => {
            const active = option.value === category;
            return (
              <Pressable
                key={option.value}
                onPress={() => onCategoryChange(option.value)}
              >
                <View
                  style={{
                    borderWidth: theme.border.width,
                    borderColor: theme.colors.ink,
                    borderRadius: theme.radius.sm,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    backgroundColor: active
                      ? theme.colors.primary
                      : theme.colors.surface,
                  }}
                >
                  <NeoText variant="label">{option.label}</NeoText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {query.length > 0 ? (
        <NeoButton
          title="Bersihkan pencarian"
          size="sm"
          variant="surface"
          onPress={() => onQueryChange('')}
        />
      ) : null}
    </View>
  );
}
