import { View } from 'react-native';
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
      style={{ flex: 1 }}
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
