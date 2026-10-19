import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { NeoButton, NeoModal, NeoTag, NeoText, useTheme } from '@/theme';

import { AWARENESS_SLIDES } from './slides';

export type AwarenessModalProps = {
  visible: boolean;
  onComplete: () => void;
  onCancel: () => void;
};

function ProgressDots({ count, active }: { count: number; active: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={{
            width: 12,
            height: 12,
            borderWidth: 2,
            borderColor: theme.colors.ink,
            borderRadius: theme.radius.sm,
            backgroundColor: index === active ? theme.colors.ink : theme.colors.surface,
          }}
        />
      ))}
    </View>
  );
}

export function AwarenessModal({ visible, onComplete, onCancel }: AwarenessModalProps) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);

  const slide = AWARENESS_SLIDES[index];
  const isLast = index === AWARENESS_SLIDES.length - 1;

  return (
    <NeoModal visible={visible} onRequestClose={onCancel} accent={theme.colors.primary}>
      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <NeoTag
            label={`${index + 1} / ${AWARENESS_SLIDES.length}`}
            color={theme.colors.blue}
          />
          <Pressable onPress={onCancel}>
            <NeoText variant="label">Nanti aja</NeoText>
          </Pressable>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <NeoText variant="title">{slide.title}</NeoText>
          <NeoText>{slide.body}</NeoText>
        </View>

        {slide.points ? (
          <View style={{ gap: theme.spacing.sm }}>
            {slide.points.map((point) => (
              <View key={point} style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                <NeoText variant="label">-</NeoText>
                <NeoText style={{ flex: 1 }}>{point}</NeoText>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {index > 0 ? (
            <NeoButton
              title="Balik"
              variant="surface"
              style={{ flex: 1 }}
              onPress={() => setIndex((i) => Math.max(0, i - 1))}
            />
          ) : null}
          <NeoButton
            title={isLast ? 'Oke, aku paham' : 'Lanjut'}
            style={{ flex: 1 }}
            onPress={() => {
              if (isLast) {
                onComplete();
              } else {
                setIndex((i) => i + 1);
              }
            }}
          />
        </View>

        <ProgressDots count={AWARENESS_SLIDES.length} active={index} />
      </View>
    </NeoModal>
  );
}
