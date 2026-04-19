# SkiaCamera crashes with `[Worklets] non-worklet function _temp` when React Compiler is enabled

Repo: https://github.com/anonymze/vision-camera-skia-getcurrentthreadmarker.git

## Versions

| Package | Version |
|---|---|
| `react-native-vision-camera-skia` | 5.0.1 |
| `react-native-vision-camera` | 5.0.1 |
| `react-native-vision-camera-worklets` | 5.0.1 |
| `react-native-worklets` | 0.8.1 |
| `react-native-reanimated` | 4.3.0 |
| `@shopify/react-native-skia` | 2.6.2 |
| `babel-plugin-react-compiler` | 19.1.0-rc.2 |
| `expo` | 55.0.8 |
| `react-native` | 0.83.2 |
| `react` | 19.1.0 |
| Node | v23.3.0 |
| OS | macOS 26.4.1 |
| Device | iPhone 13 mini (iOS 26.4.1, real device) |

---

## Description

When `react-compiler` is enabled in an Expo project, the `onFrame={(frame, render) => { 'worklet'; ... }}` arrow passed to `<SkiaCamera>` gets wrapped by React Compiler's auto-memoization. The compiler emits internal `_temp` helper variables to cache the prop value across renders.

The worklets value packer (`react-native-worklets`) then captures those `_temp` symbols into the worklet's closure, serializes them as `RemoteFunction` stubs (since they are not worklet-flagged JS functions), and the runtime throws on invocation.

The crash fires immediately on the first rendered frame, the preview stays black, and the same error spams the console for every dropped frame.

**Plain `<Camera>` with React Compiler enabled does NOT crash** — this is specific to `<SkiaCamera>`.

## Steps to reproduce

1. Clone the repo
2. `pnpm install`
3. Confirm `experiments.reactCompiler: true` is set in `app.json`
4. Open `App.tsx` and **remove the `'use no memo'` directive at the top of the file**
5. `pnpm prebuild`
6. `pnpm ios --device`
7. Grant camera permission

The `_temp` crash fires immediately when the preview tries to render its first frame.

## Expected behavior

`<SkiaCamera>` shows the camera preview. React Compiler's auto-memoization should not interfere with worklet serialization.

## Actual behavior

No preview (black screen). Console fills with:

```
Failed to render! Error: [Worklets] Tried to synchronously call a non-worklet function `_temp` on the UI thread.
See https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#tried-to-synchronously-call-a-non-worklet-function-on-the-ui-thread for more details.

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

## Workaround

Add `'use no memo';` at the top of any file that passes a worklet callback (`onFrame`) to `<SkiaCamera>`. Opts the file out of React Compiler's transformations while leaving the rest of the app optimised.

---

## Note on the original `getCurrentThreadMarker` issue

This repo originally reproduced `[Worklets] Tried to synchronously call a non-worklet function 'getCurrentThreadMarker'`. That issue is **resolved upstream** in commit [`1deb582`](https://github.com/mrousavy/react-native-vision-camera/commit/1deb582df057e4a8a40ef80e2c4ebb2f55a51e18) (not yet on npm at time of writing — `5.0.1` is current latest). The repo applies that commit's `'worklet'` directive locally via `patches/react-native-vision-camera-worklets+5.0.1.patch` so this bug can be reproduced cleanly.
