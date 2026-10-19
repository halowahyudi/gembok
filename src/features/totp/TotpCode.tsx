import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useNow } from '@/lib/useNow';
import { NeoText, useTheme } from '@/theme';
import { generateTotp, totpRemainingSeconds, type TotpAlgorithm } from '@/totp/totp';

export type TotpCodeProps = {
  secret: string;
  algorithm?: TotpAlgorithm;
  digits?: number;
  period?: number;
  /** When false the code is display-only (used in list rows). */
  copyable?: boolean;
};

function group(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : `${code.slice(0, 3)} ${code.slice(3)}`;
}

export function TotpCode({
  secret,
  algorithm = 'SHA1',
  digits = 6,
  period = 30,
  copyable = false,
}: TotpCodeProps) {
  const theme = useTheme();
  const now = useNow(1000);
  const [copied, setCopied] = useState(false);

  let code: string;
  try {
    code = generateTotp({ secret, algorithm, digits, period }, now);
  } catch {
    return (
      <NeoText variant="caption" color={theme.colors.danger}>
        Kunci 2FA tidak valid.
      </NeoText>
    );
  }

  const remaining = totpRemainingSeconds(period, now);
  const urgent = remaining <= 5;

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const codeText = (
    <NeoText
      variant="subtitle"
      style={{ fontVariant: ['tabular-nums'], letterSpacing: 2 }}
    >
      {group(code)}
    </NeoText>
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        flexWrap: 'wrap',
      }}
    >
      {copyable ? (
        <Pressable onPress={copy} accessibilityRole="button">
          {codeText}
        </Pressable>
      ) : (
        codeText
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: urgent ? theme.colors.danger : theme.colors.success,
          }}
        />
        <NeoText variant="caption" color={theme.colors.muted}>
          {remaining}s
        </NeoText>
      </View>

      {copied ? (
        <NeoText variant="caption" color={theme.colors.success}>
          Tersalin
        </NeoText>
      ) : null}
    </View>
  );
}
