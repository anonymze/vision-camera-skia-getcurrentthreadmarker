// remove the `'use no memo'` directive below to reproduce the React Compiler `_temp` crash.
// with it: SkiaCamera renders normally.
// without it: `[Worklets] Tried to synchronously call a non-worklet function _temp on the UI thread`.
'use no memo';

import { StyleSheet, View } from 'react-native';
import {
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { SkiaCamera } from 'react-native-vision-camera-skia';

export default function App() {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  if (!hasPermission) {
    requestPermission();
    return <View style={{ flex: 1 }} />;
  }
  if (device == null) return <View style={{ flex: 1 }} />;

  return (
    <SkiaCamera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={true}
      onFrame={(frame, render) => {
        'worklet';
        render(({ frameTexture, canvas }) => {
          canvas.drawImage(frameTexture, 0, 0);
        });
        frame.dispose();
      }}
    />
  );
}
