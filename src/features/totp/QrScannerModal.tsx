import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useState } from 'react';
import { Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  acquireAutoLockSuppression,
  releaseAutoLockSuppression,
} from '@/device/auto-lock-guard';
import { NeoButton, NeoNotice, NeoText, useTheme } from '@/theme';

export type QrScannerModalProps = {
  onClose: () => void;
  onScan: (data: string) => void;
};

// Rendered only while open, so the "already scanned" flag resets each time.
export function QrScannerModal({ onClose, onScan }: QrScannerModalProps) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Keep auto-lock quiet while the camera (and its permission dialog) is open.
  useEffect(() => {
    acquireAutoLockSuppression();
    return () => releaseAutoLockSuppression();
  }, []);

  const handleScan = (result: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScan(result.data);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
        {!permission ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <NeoText color="#FFFFFF">Memuat kamera...</NeoText>
          </View>
        ) : !permission.granted ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              gap: theme.spacing.lg,
              padding: theme.spacing.lg,
            }}
          >
            <NeoNotice
              title="Butuh izin kamera"
              message="Izinkan akses kamera untuk memindai kode QR 2FA."
            />
            <NeoButton
              title="Izinkan kamera"
              fullWidth
              onPress={() => requestPermission()}
            />
            <NeoButton title="Tutup" variant="surface" fullWidth onPress={onClose} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleScan}
            />
            <View
              style={{
                position: 'absolute',
                bottom: theme.spacing.xl,
                left: theme.spacing.lg,
                right: theme.spacing.lg,
              }}
            >
              <NeoButton title="Tutup" variant="surface" fullWidth onPress={onClose} />
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
