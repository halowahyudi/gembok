import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { TotpCode } from '@/features/totp/TotpCode';
import { NeoCard, NeoTag, NeoText, useTheme } from '@/theme';
import { generateTotp } from '@/totp/totp';
import type { VaultEntry } from '@/vault/models';

import { ITEM_TYPE_COLOR, ITEM_TYPE_LABEL } from './itemTypes';

export function VaultItemCard({
  entry,
  onPress,
}: {
  entry: VaultEntry;
  onPress: () => void;
}) {
  const theme = useTheme();
  const item = entry.item;
  const isTotp = item.type === 'totp' && item.totpSecret.length > 0;
  const secondary = item.username || item.cardHolder;
  const [copied, setCopied] = useState(false);

  // Long-press copies the current 2FA code.
  const copyCode = async () => {
    try {
      const code = generateTotp({
        secret: item.totpSecret,
        algorithm: item.totpAlgorithm,
        digits: item.totpDigits,
        period: item.totpPeriod,
      });
      await Clipboard.setStringAsync(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Invalid secret: the card already shows an error, nothing to copy.
    }
  };

  return (
    <Pressable onPress={onPress} onLongPress={isTotp ? copyCode : undefined}>
      <NeoCard style={{ marginBottom: theme.spacing.md }}>
        <View style={{ gap: 4 }}>
          <NeoTag
            label={ITEM_TYPE_LABEL[item.type]}
            color={theme.colors[ITEM_TYPE_COLOR[item.type]]}
          />
          <NeoText variant="subtitle">{item.title}</NeoText>
          {isTotp ? (
            <TotpCode
              secret={item.totpSecret}
              algorithm={item.totpAlgorithm}
              digits={item.totpDigits}
              period={item.totpPeriod}
            />
          ) : secondary ? (
            <NeoText color={theme.colors.muted}>{secondary}</NeoText>
          ) : null}
          {copied ? (
            <NeoText variant="caption" color={theme.colors.success}>
              Kode tersalin
            </NeoText>
          ) : null}
        </View>
      </NeoCard>
    </Pressable>
  );
}
