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

Bridgeless mode, Fabric and TurboModules are always on — the legacy architecture was
removed in RN 0.82, so there is no flag. The **TurboModule** tab reads
`RN$Bridgeless` / `nativeFabricUIManager` at runtime to prove it.

## What each piece demonstrates

- **NativeSdkCore** — sync JSI calls (`getSdkVersion`, `getConstants`), Promise
  methods with typed reject codes (`E_INVALID_CONFIG`, `E_NOT_INITIALIZED`,
  `E_INVALID_AMOUNT`, `E_INVALID_CURRENCY`), and a codegen-typed
  `EventEmitter` (`onStatusChange`).
- **NativeSdkCrypto** — synchronous C++ `sha256` and `luhnCheck`, no platform code.
- **PayButton** — typed props (incl. a `WithDefault` string-union enum), a direct
  event (`onPayPress`) and a view command (`setLoading`).

## Cashfree PG SDK (UPI Intent) — New Arch compatibility check

`react-native-cashfree-pg-sdk@3.0.0` (+ `cashfree-pg-api-contract@2.1.1`) is integrated
on the **UPI** tab, UPI Intent only, in two flavours:

- **Drop-in checkout** — `doUPIPayment(new CFUPIIntentCheckoutPayment(session, theme))`;
  Cashfree renders its own "Select UPI Application" sheet.
- **Element payment** — `makePayment(new CFUPIPayment(session, new CFUPI(UPIMode.INTENT, appId)))`;
  the app lists apps via `getInstalledUpiApps()` and lets the user pick one (the SDK's
  example just takes the last app in the list).

**Which SDK build:** 3.0.0 is **not on npm** (npm `latest` is still 2.4.0). It comes from the
GitHub branch `cashfree/react-native-cashfree-pg-sdk#feature/new-architecture-repro-samples`,
pinned in `package-lock.json` to commit `aa69cc8`. 3.0.0 is a real TurboModule:

- codegen spec `src/NativeCashfreePgApi.ts` (`TurboModuleRegistry.getEnforcing('CashfreePgApi')`),
  `codegenConfig` name `RNCashfreePgApiSpec`
- Android: `CashfreePgApiModule extends NativeCashfreePgApiSpec`, registered by a
  `TurboReactPackage` with `isTurboModule = true`
- iOS: `CashfreePgApi` conforms to `NativeCashfreePgApiSpec` and returns
  `NativeCashfreePgApiSpecJSI` from `getTurboModule:`
- events (`cfSuccess` / `cfFailure` / `cfEvent`) come from the module itself
  (`RCTDeviceEventEmitter` on Android, `RCTEventEmitter` on iOS). The separate iOS
  `CashfreeEventEmitter` module from 2.x is gone.

2.4.0 was a legacy bridge module that only worked through RN's interop layer. That verdict
is in [`docs/cashfree-rn-sdk-new-arch-compatibility.md`](docs/cashfree-rn-sdk-new-arch-compatibility.md)
and still applies to anyone on the npm release.

The tab's **CASHFREE NATIVE MODULE** card shows `TurboModuleRegistry.get('CashfreePgApi')`
(the lookup the SDK itself uses, and what the wrapper checks before any payment) next to the
legacy `NativeModules` lookup, for comparison.

Wrapper: `src/payments/CashfreeUpiCheckout.ts` turns the SDK's global callback into a
Promise, blocks concurrent checkouts and rejects empty ids / missing app before native is
touched (the Android element flow throws `IllegalStateException` out of the `@ReactMethod`
on a bad payload; iOS force-unwraps). `getInstalledUpiApps()` has a 5 s timeout because on
iOS the SDK's `removeCallback()` also tears down the app-list listener.

Create a sandbox order on your machine (keys stay out of the app):

```sh
CASHFREE_CLIENT_ID=... CASHFREE_CLIENT_SECRET=... node scripts/create-sandbox-order.mjs 1
```

Or, in **debug builds only**, tap *Create ₹1 sandbox order & prefill* on the UPI tab. Keys
live in the gitignored `src/dev/cashfreeSandbox.local.ts` (created from the `.example.ts`
on `npm install`). The `require` sits inside a literal `if (__DEV__)` block so Metro drops
it from release bundles — verified by grepping `--dev false` bundles for the key.
Keep it that way: an early-return guard left the key in the release bundle.

Otherwise paste `order_id` + `payment_session_id` into the UPI tab. UPI Intent needs a real UPI
app, so a full payment needs a physical device; simulators/emulators reach the SDK's
error callback.

## Strict mode: run with RN's legacy-module interop OFF

RN 0.87 keeps legacy (non-TurboModule) native modules alive through an interop layer that
is **on by default** (Android: `ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android`;
iOS: `RCTRootViewFactory` calls `RCTEnableTurboModuleInterop(YES)`). This repo sets no
legacy flags of its own; the switches below turn that framework default off to see what a
library needs it for. The Turbo tab's RUNTIME card shows the live native state.

| | Interop ON (RN default) | Interop OFF (strict) |
|---|---|---|
| Android | `./gradlew assembleDebug` | `./gradlew assembleDebug -PdisableLegacyInterop=true` |
| iOS | normal launch | `xcrun simctl launch booted org.reactjs.native.example.RNNewArchSample -DisableLegacyInterop YES` (or add the argument to the Xcode scheme) |

### Result with interop OFF (SDK 3.0.0 @ `aa69cc8`, verified 29 Sep 2026)

The Cashfree SDK works as a direct TurboModule with no interop.

| | Android (emulator, `-PdisableLegacyInterop=true`) | iOS (iPhone 16 sim, iOS 18.6, `-DisableLegacyInterop YES`) |
|---|---|---|
| Interop actually off | Turbo tab: `Legacy module interop: OFF (strict)` | log: `[LegacyInterop] Legacy module interop DISABLED via launch argument` |
| Module resolves | `TurboModuleRegistry.get` → `true` | `TurboModuleRegistry.get` → `true` |
| SDK loads (UPI tab) | yes | yes. The 2.4.0 `NativeEventEmitter` crash is gone |
| `getInstalledUpiApps()` (Promise) | resolved: Cashfree UPI Simulator | resolved: empty list (no UPI apps on a simulator) |
| Element UPI Intent payment, ₹1 sandbox | launched UPI Simulator → success → `cfSuccess` event → `onVerify(order_id)` | not run: needs a device with a UPI app |

Not yet verified with interop off: the drop-in `doUPIPayment` flow, the iOS payment and
event round-trip (needs a physical iPhone with a UPI app), and release builds.

This app's own TurboModule, C++ module and Fabric component keep working with interop off,
as before.

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
cd ios && bundle install && bundle exec pod install && cd ..
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
