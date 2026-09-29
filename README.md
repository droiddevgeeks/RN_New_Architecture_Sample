# RN New Architecture Sample

React Native **0.87.1** (React 19.2.3, Hermes) app showing every New Architecture
primitive an SDK needs, generated from typed codegen specs:

| Primitive | Spec | iOS | Android |
|---|---|---|---|
| Turbo Native Module | `specs/NativeSdkCore.ts` | `ios/Sdk/RCTSdkCore.mm` → `SdkCoreImpl.swift` | `sdk/SdkCoreModule.kt` → `SdkCore.kt` |
| C++ Turbo Native Module | `specs/NativeSdkCrypto.ts` | `ios/Sdk/RCTSdkCryptoProvider.mm` | `jni/OnLoad.cpp` (`cxxModuleProvider`) |
| Fabric Native Component | `specs/PayButtonNativeComponent.ts` | `ios/Sdk/RCTPayButtonComponentView.mm` → `PayButtonView.swift` | `sdk/PayButtonManager.kt` → `PayButtonView.kt` |

The C++ module has a single implementation in `shared/NativeSdkCrypto.{h,cpp}`,
compiled into both apps.

Bridgeless mode, Fabric and TurboModules are always on in RN 0.82+, with no flag. On top of
that, this app **removes RN's interop layers** (see below), so every native module must be
a real TurboModule and every native view a real Fabric component. There is no fallback.
The **Turbo** tab reads `RN$Bridgeless` / `nativeFabricUIManager` at runtime.

## New Architecture only: interop layers removed

| | TurboModule interop | Fabric (view) interop | How |
|---|---|---|---|
| iOS | compiled out | compiled out | `ios/Podfile`: `-DRCT_REMOVE_LEGACY_MODULE_INTEROP=1` and `-DRCT_REMOVE_LEGACY_COMPONENT_INTEROP=1`, with `RCT_USE_PREBUILT_RNCORE=0` so React Native core is built from source |
| Android | off | off | `MainApplication.disableInteropLayers()`: `useTurboModuleInterop()` and `useFabricInterop()` forced `false` before the `ReactHost` is created |

Why iOS builds RN core from source: the prebuilt `React.framework` ships with the interop
code compiled in, and at startup its `RCTRootViewFactory` turns module interop on. With the
prebuilt core the compile flags only reach app and library code. Checked on a from-source
build: `RCTEnableTurboModuleInterop`, `RCTInteropTurboModule`, `provideLegacyModule`,
`RCTEnableFabricInteropLayer` and `RCTLegacyViewManagerInteropComponentView` are absent
from every binary in the `.app`, while `RCTTurboModuleManager` / `RCTHost` are present.
The first iOS build takes about 6 min.

Android ships RN as a prebuilt AAR, so it has no compile-time switch. The flag override
is the supported mechanism, and at runtime it reads `useTurboModuleInterop=false`,
`useFabricInterop=false`.

## What each piece demonstrates

- **NativeSdkCore** — sync JSI calls (`getSdkVersion`, `getConstants`), Promise
  methods with typed reject codes (`E_INVALID_CONFIG`, `E_NOT_INITIALIZED`,
  `E_INVALID_AMOUNT`, `E_INVALID_CURRENCY`), and a codegen-typed
  `EventEmitter` (`onStatusChange`).
- **NativeSdkCrypto** — synchronous C++ `sha256` and `luhnCheck`, no platform code.
- **PayButton** — typed props (incl. a `WithDefault` string-union enum), a direct
  event (`onPayPress`) and a view command (`setLoading`).

## Cashfree PG SDK 3.0.0 (GitHub branch), New Architecture compatibility

**SDK under test:** `react-native-cashfree-pg-sdk@3.0.0` from
`cashfree/react-native-cashfree-pg-sdk#feature/new-architecture-repro-samples`, pinned in
`package-lock.json` to commit `aa69cc8`. It is not on npm (npm `latest` is 2.4.0).
Used with `cashfree-pg-api-contract@2.1.1`.

The **UPI** tab integrates UPI Intent in two flavours:

- **Drop-in checkout**: `doUPIPayment(new CFUPIIntentCheckoutPayment(session, theme))`.
  Cashfree renders its own UPI app sheet.
- **Element payment**: `makePayment(new CFUPIPayment(session, new CFUPI(UPIMode.INTENT, appId)))`.
  The app lists apps via `getInstalledUpiApps()` and the user picks one.

### Verdict

**Compatible**: it runs as a real TurboModule with both interop layers removed, on both
platforms.

### Code audit (SDK @ `aa69cc8`)

| Area | Finding |
|---|---|
| Spec | `src/NativeCashfreePgApi.ts`, `TurboModuleRegistry.getEnforcing('CashfreePgApi')`, `codegenConfig` `RNCashfreePgApiSpec` (`type: modules`) ✅ |
| Android module | `CashfreePgApiModule extends NativeCashfreePgApiSpec`; `TurboReactPackage` with `isTurboModule = true` ✅ |
| iOS module | `CashfreePgApi` conforms to `NativeCashfreePgApiSpec`, `getTurboModule:` returns `NativeCashfreePgApiSpecJSI` ✅ |
| JS | no `NativeModules`, no `requireNativeComponent`; the Card components are plain `TextInput` ✅ |
| Native views | none. The SDK presents its own native screens, so there is nothing for Fabric to host ✅ |

### Runtime results (interop removed, 29 Sep 2026)

| Check | Android (emulator) | iOS (iPhone 16 sim, iOS 18.6) |
|---|---|---|
| `TurboModuleRegistry.get('CashfreePgApi')` | ✅ | ✅ |
| `getInstalledUpiApps()` (Promise) | ✅ Cashfree UPI Simulator | ✅ empty list (no UPI apps on a simulator) |
| Element UPI Intent → success | ✅ `cfSuccess` → `onVerify(order_id)` | n/a (no UPI app) |
| Drop-in `doUPIPayment` → failed | ✅ `cfFailure` → `onError(payment_failed)` | — |
| Drop-in `doUPIPayment` → success | — | ✅ Cashfree checkout (UPI collect, sandbox VPA) → `cfSuccess` → `onVerify(order_id)` |

Not verified: `setEventSubscriber` (`cfEvent`), cards / netbanking / subscriptions, iOS UPI
Intent on a device, and release builds.

This app's own TurboModule (sync, Promise, typed events), C++ module and Fabric component
(props, direct event, view command) were re-checked on the same builds.

### Running a payment

`src/payments/CashfreeUpiCheckout.ts` turns the SDK's global callback into a Promise,
checks the TurboModule is registered, blocks concurrent checkouts, and rejects empty ids or
a missing app before native is touched. `getInstalledUpiApps()` has a 5 s timeout because
on iOS the SDK's `removeCallback()` also tears down the app-list listener.

Create a sandbox order on your machine (keys stay out of the app):

```sh
CASHFREE_CLIENT_ID=... CASHFREE_CLIENT_SECRET=... node scripts/create-sandbox-order.mjs 1
```

Or, in **debug builds only**, tap *Create ₹1 sandbox order & prefill* on the UPI tab. Keys
live in the gitignored `src/dev/cashfreeSandbox.local.ts` (created from the `.example.ts`
on `npm install`). The `require` sits inside a literal `if (__DEV__)` block so Metro drops
it from release bundles, verified by grepping `--dev false` bundles for the key.
Keep it that way: an early-return guard left the key in the release bundle.

Otherwise paste `order_id` + `payment_session_id` into the UPI tab. UPI Intent needs a UPI
app: the Android emulator works with the Cashfree UPI Simulator installed; on the iOS
simulator only the drop-in flow can complete (via UPI collect).

## Layout

```
specs/        codegen specs — single source of truth (codegenConfig.jsSrcsDir)
shared/       C++ Turbo Module implementation
src/sdk/      typed JS facade; screens import only from here (future package boundary)
src/screens/  demo screens, one per primitive
ios/Sdk/      Swift logic + thin ObjC++ adapters
android/app/src/main/java/com/rnnewarchsample/sdk/  Kotlin module, view, package
android/app/src/main/jni/   CMakeLists.txt + OnLoad.cpp (registers the C++ module)
```

Registration:
- iOS: `package.json` → `codegenConfig.ios.modules` / `ios.components` map spec names to
  ObjC classes (current API; replaces `modulesProvider` / `componentProvider`).
- Android: `SdkPackage` (`BaseReactPackage`) added in `MainApplication`; the C++ module
  via `cxxModuleProvider` in `jni/OnLoad.cpp`; the Fabric component descriptor is
  registered automatically by app codegen.

## Run

```sh
npm install
cd ios && bundle install && bundle exec pod install && cd ..   # first iOS build compiles RN core (~6 min)
npm start
npm run ios       # or: npm run android
```

After editing anything in `specs/`, re-run `pod install` (iOS) — Gradle regenerates
Android codegen on build.

## Gotchas hit while building this

- Command specs must write `React.ComponentRef<HostComponent<NativeProps>>` inline —
  codegen rejects a type alias.
- Importing `RNNewArchSample-Swift.h` from `.mm` fails unless the ObjC superclass of
  `AppDelegate.swift`'s `ReactNativeDelegate` is imported first — see
  `ios/Sdk/SdkSwiftBridge.h`.
- `@react-native/typescript-config` forces `types: ["jest"]`; overridden in
  `tsconfig.json` because this sample has no tests.
- Codegen module specs don't support string-literal unions, so `env` is `string` in the
  spec and narrowed to `'SANDBOX' | 'PROD'` in the JS facade + validated natively.
