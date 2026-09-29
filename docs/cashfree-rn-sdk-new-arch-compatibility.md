# Cashfree React Native SDK 2.4.0 — New Architecture compatibility

**As of:** 28 Sep 2026

`react-native-cashfree-pg-sdk` 2.4.0 runs on React Native 0.87 (New Architecture, bridgeless) only through React Native's legacy-module compatibility layer, which is on by default. It is not a New Architecture module: with that layer off it is unavailable on Android and crashes on iOS.

## Verdict

Safe to use on React Native 0.87 with the default settings; not safe to describe as "New Architecture supported".

| Question | Answer |
| --- | --- |
| Does it run on RN 0.87 with default settings? | Yes on Android, verified end to end including a minified release build. iOS builds and loads; payment flows still need a device run. |
| Is it a New Architecture (TurboModule) library? | No. It has no codegen spec, and [reactnative.directory](https://reactnative.directory/api/libraries?search=react-native-cashfree-pg-sdk) lists its New Architecture support as unknown / not supported. |
| Does it work with the compatibility layer turned off? | No. Android: the module is missing and no payment can start. iOS: the app crashes the first time the SDK is used. |
| Can the layer be kept on for Cashfree only? | No. The switch is app-wide in React Native; there is no per-library setting. |
| Is there a newer SDK that fixes this? | Not as of this report: 2.4.0 (21 May 2026) is the latest on npm. |

## How it works today

The SDK is an old-style (legacy) native module, so React Native reaches it only through its compatibility layer. React Native 0.87 turns that layer on by default: on Android through its stable release's feature flags (`useTurboModuleInterop = true`), on iOS by calling `RCTEnableTurboModuleInterop(YES)` at app start.

| Path | JS | Middle | Native | Result |
| --- | --- | --- | --- | --- |
| Today (RN default) | Merchant JS → `CFPaymentGatewayService` | Compatibility layer **ON** | Cashfree native SDK (legacy module, Java / Swift) | Works |
| Strict mode | Merchant JS → `CFPaymentGatewayService` | Compatibility layer **OFF** — module not found | Never reached | Fails: Android `NativeModules.CashfreePgApi` is null; iOS crashes on first SDK use |
| What full support looks like | Merchant JS → typed codegen spec | JSI, direct — no compatibility layer | Native TurboModule | Works with the layer ON or OFF |

Payment results come back as events: `RCTNativeAppEventEmitter` on Android and an `RCTEventEmitter` subclass on iOS. Both also run through the layer. A TurboModule skips the layer entirely, which is why the test app's own TurboModules kept working when the layer was off.

## Test results (compatibility layer on)

With React Native's default settings, every check we could run on Android passed; on iOS we confirmed build and load, not payments.

| Check | Android | iOS |
| --- | --- | --- |
| Installs and autolinks | Pass | Pass (CashfreePG 2.4.0 pods) |
| Debug build | Pass | Pass |
| Build with `use_frameworks! :linkage => :static` | Not applicable | Pass |
| Minified release build (R8) | Pass: module found, calls and callbacks delivered | Not run |
| SDK modules found at runtime (bridgeless) | Pass | Pass |
| `getInstalledUpiApps()` | Pass: lists installed UPI apps | Not run: simulator has no UPI apps |
| UPI Intent via `makePayment(CFUPIPayment)` | Pass: order reached PAID (emulator, Cashfree UPI Simulator) | Not run |
| Drop-in UPI Intent checkout (`doUPIPayment`) | Opens; never completed (see Known issues) | Not run |
| `onVerify` / `onError` delivered to JS | Pass | Not run |
| Google Play 16 KB page size | Pass: the SDK ships no native `.so` files | Not applicable |
| JS APIs removed in Fabric or React 19 | None used | None used |

"Not run" means untested, not failed. iOS payment flows and a paid release-build run on Android are the remaining gaps.

## Strict mode: compatibility layer off

With only the layer switched off, the Cashfree SDK stopped working on both platforms while real TurboModules in the same build kept working.

| Module | Type | Layer on | Layer off |
| --- | --- | --- | --- |
| Cashfree `CashfreePgApi` | Legacy native module | Found | Null on Android and iOS; no payment can start |
| Cashfree `CashfreeEventEmitter` (iOS) | Legacy event emitter | Found | Null; the SDK throws `new NativeEventEmitter() requires a non-null argument` the first time it is used |
| TurboModule with Promise methods and events | TurboModule (codegen) | Works | Works |
| Pure C++ TurboModule | TurboModule (codegen) | Works | Works (checked on Android) |
| Native button component | Fabric component | Works | Works (checked on Android) |

The iOS failure happens when the SDK is first loaded, not when a payment starts. Because Metro loads modules on first use, the app launches normally and then crashes when the payment screen first touches the SDK; in release builds that closes the app.

On Android, calling the SDK with the layer off shows its own error: "The package 'react-native-cashfree-pg-api' doesn't seem to be linked... run pod install / rebuild". That message is misleading: the package is installed, and the name it gives is wrong.

Merchants rarely switch the layer off, and only deliberately: there is no simple setting for it. It is an app-wide switch, so it cannot be kept on for Cashfree alone. React Native has said the layer stays "for the foreseeable future" without giving a removal date ([0.82 release notes](https://reactnative.dev/blog/2025/10/08/react-native-0.82)).

## Known issues and risks in SDK 2.4.0

The biggest risks are the SDK's dependence on the compatibility layer and `onVerify` being mistaken for a successful payment.

| Severity | Issue | Impact on merchants |
| --- | --- | --- |
| High | No New Architecture implementation (no codegen spec) | Breaks if the compatibility layer is switched off now or removed in a future React Native release |
| High | `onVerify` fires even when the payment is not complete | Seen twice in testing: `onVerify` arrived while Cashfree reported the payment `NOT_ATTEMPTED` or `PENDING`. Fulfilling on `onVerify` alone risks shipping unpaid orders |
| High | iOS: `onError` not fired when the user backs out of the payment page ([issue #97](https://github.com/cashfree/react-native-cashfree-pg-sdk/issues/97)) | The app waits forever for a result; any "payment in progress" state never clears |
| Medium | Crash paths on bad input: force-unwraps in iOS (`try!`, `session!`); an uncaught `IllegalStateException` in the Android `makePayment` path | An empty or malformed order id or session id can crash the app instead of returning an error |
| Medium | iOS reads UIKit state (`RCTPresentedViewController()`) on a background queue | Possible Main Thread Checker warnings or intermittent UI crashes; also true on the old architecture |
| Medium | Deprecated React Native APIs: `getCurrentActivity()`, `ReactPackage.createNativeModules`, `NativeAppEventEmitter`, Gradle dependency `react-native:+`, Java 1.8 target | Builds today; likely to break in a future React Native release |
| Medium | SDK screens have no edge-to-edge inset handling; React Native 0.87 targets Android SDK 36 | Cashfree screens may draw under the status or navigation bar on Android 15+. Not verified on a device |
| Low | Misleading error when the module is missing (names `react-native-cashfree-pg-api`, suggests reinstalling) | Sends merchants debugging the wrong problem |

In our sandbox account the drop-in checkout never completed: Cashfree's config service returned `order_token_invalid` for sessions its payments API accepted. That points to a server-side or account-configuration issue, not to the New Architecture.

## Guidance for merchants

Keep React Native's defaults, confirm every payment on your backend, and guard the SDK calls.

1. **Keep the compatibility layer on.** Don't switch off legacy-module interop anywhere in the app while you use SDK 2.4.0. On Android, if you override React Native feature flags, base your override on `ReactNativeNewArchitectureFeatureFlagsDefaults`: the base `ReactNativeFeatureFlagsDefaults` has interop off, which disables the SDK without warning.
2. **Never fulfil on `onVerify` alone.** Fetch the order from Cashfree on your server (`GET /pg/orders/{order_id}`) and fulfil only when `order_status` is `PAID`. Also reconcile with webhooks, in case the app is closed or killed while the customer is in their UPI app.
3. **Check the module exists before calling the SDK.** If `NativeModules.CashfreePgApi` is missing, show your own clear error rather than the SDK's misleading one.
4. **On iOS, load the SDK only after checking `NativeModules.CashfreeEventEmitter`.** For example, `require` it lazily inside the payment flow. That turns the strict-mode crash into an error you can handle.
5. **Validate inputs before calling the SDK.** Reject an empty or malformed `order_id`, `payment_session_id` or UPI app id in JavaScript.
6. **Time out a pending checkout.** Because of issue #97, clear any "in progress" state after a timeout or when the app returns to the foreground, then check the order status on your server.
7. **Test the release build.** Run a real UPI Intent payment on a physical device with R8/ProGuard enabled on Android, and on iOS with Xcode's Main Thread Checker on.
8. **Check Cashfree screens on Android 15+.** With React Native 0.87 (target SDK 36), confirm the SDK's screens don't draw under the system bars.
9. **Don't describe your integration as "New Architecture ready" for this dependency** until Cashfree ships a TurboModule version.

## What full New Architecture support requires

The SDK needs to ship as a TurboModule; merchants cannot fix this from their side.

1. A typed codegen spec (for example `NativeCashfreePgApi.ts`) and a `codegenConfig` entry in `package.json`, so React Native generates the native interfaces.
2. The native module rebuilt on the generated spec: iOS conforming to the generated protocol (Swift behind a thin Objective-C++ adapter), Android extending the generated spec class and registered through `BaseReactPackage`.
3. Results delivered through the codegen `EventEmitter` type or Promises, replacing `RCTEventEmitter` and `RCTNativeAppEventEmitter`.
4. The deprecated calls replaced: `reactApplicationContext.currentActivity` instead of `getCurrentActivity()`, and `com.facebook.react:react-android` instead of `react-native:+`.
5. Errors returned to JavaScript instead of force-unwraps and uncaught exceptions, and UIKit work moved to the main thread.
6. Once shipped, reactnative.directory would list the package as supporting the New Architecture, which it detects from `codegenConfig`.

Until then, the only other route for a merchant who must run with the layer off is writing their own TurboModule over Cashfree's native Android and iOS SDKs. That is real engineering work, and they then maintain a payments integration themselves.

## Test environment and sources

| Item | Version or setup |
| --- | --- |
| React Native | 0.87.1, bridgeless, Fabric, Hermes; fresh `@react-native-community/cli` 20.2.0 project |
| React | 19.2.3 |
| SDK | `react-native-cashfree-pg-sdk` 2.4.0, `cashfree-pg-api-contract` 2.1.1; native CashfreePG 2.4.0 (iOS), `com.cashfree.pg:api` 2.4.0 (Android) |
| Android | Emulator, API 34; Realme RMX1801 on Android 10 (physical, arm64) |
| iOS | iPhone 16 Pro simulator; Xcode 26.2 |
| Payments | Cashfree sandbox; Cashfree UPI Simulator app on Android |
| Strict-mode switch | Android: `useTurboModuleInterop = false` over React Native's stable defaults. iOS: `RCTEnableTurboModuleInterop(NO)` before the runtime starts |

The sandbox was intermittently unhealthy during testing: HTTP 500/504 on order creation and 10 s timeouts. Failures traced to that were not counted against the SDK.

Sources:

- [React Native 0.76: the New Architecture is here](https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here)
- [React Native 0.82 release notes](https://reactnative.dev/blog/2025/10/08/react-native-0.82)
- [React Native 0.87 release notes](https://reactnative.dev/blog/2026/08/11/react-native-0.87)
- [New Architecture working group: interop layer limitations](https://github.com/reactwg/react-native-new-architecture/discussions/237)
- [reactnative.directory entry for the SDK](https://reactnative.directory/api/libraries?search=react-native-cashfree-pg-sdk)
- [cashfree/react-native-cashfree-pg-sdk on GitHub](https://github.com/cashfree/react-native-cashfree-pg-sdk)
- [Cashfree React Native integration guide](https://www.cashfree.com/docs/payments/online/mobile/react-native)
- React Native 0.87.1 source, read directly: `ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android.kt`, `ReactPackageTurboModuleManagerDelegate.kt`, `RCTRootViewFactory.mm`, `RCTTurboModuleManager.mm`
