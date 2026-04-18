# SkiaCamera `onFrame` worklet crashes with `[Worklets] Tried to synchronously call a non-worklet function 'getCurrentThreadMarker'`

Repo: https://github.com/anonymze/vision-camera-skia-getcurrentthreadmarker.git

## Description

Rendering a `<SkiaCamera>` from `react-native-vision-camera-skia@5.0.1` with the documented minimal `onFrame` callback (the exact example shown in the JSDoc of the `onFrame` prop) immediately throws a worklets runtime error and the camera preview stays black. Every frame triggers the same error in a loop.

The failing function is `getCurrentThreadMarker` from `react-native-vision-camera-worklets`, which is called from inside the `'worklet'` function `getSurface` in `SurfacesCache.ts`. The `react-native-worklets` value packer serializes `getCurrentThreadMarker` as a `RemoteFunction` (because the imported module is not in the babel plugin's `alwaysAllowed` whitelist and Bundle Mode is not enabled). Calling that stub from worklet context throws.

After patching the `getCurrentThreadMarker()` call out of `SurfacesCache.ts`, the same crash chain re-fires, but now the function name in the error is `_temp`, which is the babel-generated identifier for the optional-chaining helper used by `snapshot?.dispose()`, `frameTexture?.dispose()`, and `nativeBuffer?.release()` inside the `onFrame` and `renderToTexture` worklets.

## Versions

| Package | Version |
|---|---|
| `react-native-vision-camera-skia` | 5.0.1 |
| `react-native-vision-camera` | 5.0.1 |
| `react-native-vision-camera-worklets` | ^5.0.1 |
| `react-native-worklets` | ^0.8.1 |
| `react-native-reanimated` | ^4.2.3 |
| `@shopify/react-native-skia` | ^2.4.18 |
| `expo` | 55.0.8 |
| `react-native` | ~0.83.2 |
| `react` | 19.1.0 |
| Node | v23.3.0 |
| OS | macOS 26.4.1 |
| Device | iPhone (iOS 26.4.1, real device) |

## Steps to reproduce

1. Clone the repo
2. `pnpm install`
3. `pnpm prebuild`
4. `pnpm ios` (or `pnpm android`) on a real device
5. Grant camera permission when prompted

The crash fires immediately when the preview tries to render its first frame.

## Expected behavior

The `<SkiaCamera>` shows the camera preview, drawing each frame to its Skia canvas via `render(({ frameTexture, canvas }) => canvas.drawImage(frameTexture, 0, 0))`.

## Actual behavior

No preview appears (black screen). The Metro/devtools console fills with this error, repeating every dropped frame:

```
Failed to render! Error: [Worklets] Tried to synchronously call a non-worklet function `getCurrentThreadMarker` on the UI thread.
See https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#tried-to-synchronously-call-a-non-worklet-function-on-the-ui-thread for more details.

Code: construct.js
  2 | var setPrototypeOf = require("./setPrototypeOf.js");
  3 | function _construct(t, e, r) {
> 4 |   if (isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments);
    |                                                                 ^
  5 |   var o = [null];
  6 |   o.push.apply(o, e);
  7 |   var p = new (t.bind.apply(t, o))();
Call Stack
  construct (<native>)
  apply (<native>)
  _construct (node_modules/@babel/runtime/helpers/construct.js:4:65)
  Wrapper (node_modules/@babel/runtime/helpers/wrapNativeSuper.js:15:23)
  construct (<native>)
  _callSuper (node_modules/@babel/runtime/helpers/callSuper.js:5:108)
  NamelessError (node_modules/@expo/metro-runtime/src/metroServerLogs.native.ts:102:20)
  captureCurrentStack (node_modules/@expo/metro-runtime/src/metroServerLogs.native.ts:106:27)
  HMRClient.log (node_modules/@expo/metro-runtime/src/metroServerLogs.native.ts:39:79)
  console.level (node_modules/react-native/Libraries/Core/setUpDeveloperTools.js:41:24)
  apply (<native>)
  methodWrapper (node_modules/react-native-worklets/src/initializers/initializers.native.ts:58:22)
```

After patching `SurfacesCache.ts` to bypass `getCurrentThreadMarker()` (hardcoding `threadId = 0`), the same error pattern re-fires with the function name `_temp` instead, pointing at babel-generated optional-chaining helpers (`snapshot?.dispose()` etc.) inside the worklets.

**Workaround applied via `patch-package`:**
- Patch `SurfacesCache.ts` to remove the `getCurrentThreadMarker` call (hardcode `threadId = 0`, works since each `SkiaCamera` runs one worklet thread)
