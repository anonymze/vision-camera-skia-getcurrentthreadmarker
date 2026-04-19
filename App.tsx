// remove the `'use no memo'` directive below to reproduce the React Compiler `_temp` crash.
// with it: SkiaCamera renders normally.
// without it: `[Worklets] Tried to synchronously call a non-worklet function _temp on the UI thread`.
'use no memo';

import { Skia } from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';
import {
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { SkiaCamera } from 'react-native-vision-camera-skia';

// A simple runtime shader: red→green→blue gradient that animates with time.
// Drawn on top of every camera frame.
const shaderSource = Skia.RuntimeEffect.Make(`
uniform float2 resolution;
uniform float time;

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / resolution;
  float r = 0.5 + 0.5 * sin(time + uv.x * 6.28);
  float g = 0.5 + 0.5 * sin(time + uv.y * 6.28 + 2.0);
  float b = 0.5 + 0.5 * sin(time + (uv.x + uv.y) * 3.14 + 4.0);
  return half4(r, g, b, 0.35);
}
`)!;

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
          // 1. Draw the camera frame
          canvas.drawImage(frameTexture, 0, 0);

          const w = frameTexture.width();
          const h = frameTexture.height();

          // 2. Animated rainbow shader on top
          const paint = Skia.Paint();
          const shader = shaderSource.makeShaderWithChildren(
            [w, h, performance.now() / 1000],
            [],
          );
          paint.setShader(shader);
          canvas.drawRect({ x: 0, y: 0, width: w, height: h }, paint);

          // 3. Solid yellow rectangle (proves drawing primitives work)
          const yellow = Skia.Paint();
          yellow.setColor(Skia.Color('yellow'));
          canvas.drawRect(
            { x: w * 0.25, y: h * 0.4, width: w * 0.5, height: h * 0.2 },
            yellow,
          );
        });
        frame.dispose();
      }}
    />
  );
}
