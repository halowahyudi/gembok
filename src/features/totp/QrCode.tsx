import createQr from 'qrcode-generator';
import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

// Renders `value` as a QR code on a white tile with a quiet zone, so it scans
// reliably regardless of the app theme.
export function QrCode({ value, size = 240 }: { value: string; size?: number }) {
  const cells = useMemo(() => {
    const qr = createQr(0, 'M');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    const dark: { x: number; y: number }[] = [];
    for (let y = 0; y < count; y += 1) {
      for (let x = 0; x < count; x += 1) {
        if (qr.isDark(y, x)) dark.push({ x, y });
      }
    }
    return { count, dark };
  }, [value]);

  const quiet = 2;
  const total = cells.count + quiet * 2;

  return (
    <View style={{ width: size, height: size, backgroundColor: '#FFFFFF' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${total} ${total}`}>
        {cells.dark.map(({ x, y }) => (
          <Rect
            key={`${x}-${y}`}
            x={x + quiet}
            y={y + quiet}
            width={1.02}
            height={1.02}
            fill="#000000"
          />
        ))}
      </Svg>
    </View>
  );
}
