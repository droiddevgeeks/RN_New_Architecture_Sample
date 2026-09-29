# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

React Native **0.87.1** / React 19.2.3 / Hermes sample app that shows every New Architecture primitive an SDK needs (Turbo Native Module, C++ Turbo Module, Fabric component), plus a New Architecture compatibility check of `react-native-cashfree-pg-sdk` 3.0.0 (UPI Intent). **New Architecture only:** RN's interop layers are removed, so there is no fallback path. `README.md` has the SDK audit and runtime results.

## Commands

```sh
npm install                      # postinstall creates src/dev/cashfreeSandbox.local.ts from the .example.ts
cd ios && bundle install && bundle exec pod install && cd ..   # RN core builds from source: first iOS build ~6 min
npm start                        # Metro
npm run ios | npm run android
npm run lint                     # eslint .
npm run typecheck                # tsc --noEmit
```

- There is **no test suite** (no Jest). `tsconfig.json` overrides `types: []` because `@react-native/typescript-config` forces `jest`. Verification = `typecheck` + `lint` + running the app.
- After editing anything in `specs/`, re-run `pod install` for iOS. Android regenerates codegen on Gradle build.
- Sandbox order (keys stay on your machine): `CASHFREE_CLIENT_ID=... CASHFREE_CLIENT_SECRET=... node scripts/create-sandbox-order.mjs 1`

## Architecture

The data flow for each primitive runs **spec → codegen → thin native adapter → platform logic**, with a typed JS facade on top:

- `specs/` is the single source of truth (`package.json` → `codegenConfig.jsSrcsDir`, codegen name `AppSpecs`, Android package `com.rnnewarchsample.specs`).
- `src/sdk/` is the typed JS facade over the specs and the intended future package boundary. **Screens import only from `src/sdk` (via `index.ts`), never from `specs/` directly.** Async errors are normalized to `SdkError` (`code` mirrors the native reject code, e.g. `E_INVALID_CONFIG`, `E_NOT_INITIALIZED`).
- `shared/NativeSdkCrypto.{h,cpp}` holds the one C++ implementation, compiled into both apps.
- iOS: `ios/Sdk/` has ObjC++ adapters (`RCT*.mm`) that delegate to Swift (`*Impl.swift`, `PayButtonView.swift`). Spec→class mapping lives in `package.json` → `codegenConfig.ios.modules` / `ios.components` (not `modulesProvider`/`componentProvider`).
- Android: `android/app/src/main/java/com/rnnewarchsample/sdk/` (Kotlin module/view/`SdkPackage`, registered in `MainApplication`). The C++ module is registered through `cxxModuleProvider` in `android/app/src/main/jni/OnLoad.cpp`; the Fabric descriptor is registered by app codegen.
- `App.tsx` is a simple tab switcher over `src/screens/*` (Turbo, C++, Fabric, UPI). `src/runtime/architecture.ts` reads `RN$Bridgeless` / `nativeFabricUIManager` to show the live architecture state.

Adding a new module/component means touching all of: the spec, `codegenConfig.ios` in `package.json`, an iOS adapter + Swift impl, a Kotlin impl + registration, and the `src/sdk` facade.

### Cashfree PG SDK integration

- The SDK is **3.0.0 from the GitHub branch `feature/new-architecture-repro-samples`**, pinned in `package-lock.json`. It is not on npm. It's a real TurboModule (`RNCashfreePgApiSpec`). The availability check is `isCashfreeTurboModuleAvailable()` (`TurboModuleRegistry.get('CashfreePgApi')`). Never use `NativeModules`.
- Known SDK issue: on iOS its methods run on RN's shared background TurboModule queue (no `methodQueue`), so it calls UIKit off the main thread. It's an SDK bug; don't work around it in app code.
- `src/payments/CashfreeUpiCheckout.ts` wraps the SDK's global callback into a Promise, blocks concurrent checkouts, and validates ids/app **before** calling native (Android throws `IllegalStateException` from the `@ReactMethod`, iOS force-unwraps on bad input). `getInstalledUpiApps()` has a 5 s timeout because on iOS `removeCallback()` also tears down the app-list listener. Keep these guards.
- The Android emulator can complete UPI Intent payments with the Cashfree UPI Simulator app installed. The iOS simulator has no UPI apps, so only the drop-in flow completes there (via UPI collect).

## Gotchas

- **Dev sandbox keys:** `src/dev/cashfreeSandbox.local.ts` is gitignored. Its `require` must stay inside a literal `if (__DEV__) { ... }` block so Metro strips it from release bundles. An early-return guard (`if (!__DEV__) return;`) leaked the key into the release bundle. Verify by grepping a `--dev false` bundle for the key.
- Fabric command specs must write `React.ComponentRef<HostComponent<NativeProps>>` inline; codegen rejects a type alias.
- Codegen module specs don't support string-literal unions. `env` is `string` in the spec, narrowed to `'SANDBOX' | 'PROD'` in the facade, and validated natively.
- Importing `RNNewArchSample-Swift.h` from `.mm` fails unless the ObjC superclass of `AppDelegate.swift`'s `ReactNativeDelegate` is imported first. See `ios/Sdk/SdkSwiftBridge.h`.
- **Interop removal, and don't undo it:**
  - iOS: `ios/Podfile` compiles both layers out (`RCT_REMOVE_LEGACY_MODULE_INTEROP` and `RCT_REMOVE_LEGACY_COMPONENT_INTEROP`). It also sets `RCT_USE_PREBUILT_RNCORE=0`, because the prebuilt `React.framework` has interop compiled in and turns it on at startup. With the prebuilt core the flags silently do nothing for RN itself.
  - Android: `MainApplication.disableInteropLayers()` forces `useTurboModuleInterop` and `useFabricInterop` to `false`.
  - A dependency that isn't a real TurboModule or Fabric component must fail here. Don't add a fallback.
