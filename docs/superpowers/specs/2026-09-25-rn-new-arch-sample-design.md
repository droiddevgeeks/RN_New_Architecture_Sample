# RN New Architecture Sample — Design

**Date:** 2026-09-25
**Status:** Approved (flow), pending spec review

## Intent

A prototype for porting a real native SDK to React Native's New Architecture
(Fabric + TurboModules + bridgeless). It must show, end to end and on both
platforms, every primitive an SDK needs: a Turbo Native Module, a C++ Turbo
Module, and a Fabric Native Component — all generated via codegen from typed
specs. Not a smoke test; not a published library (yet).

### Decisions made by the user
- Purpose: prototype groundwork for a real SDK.
- Structure: single bare RN app with app-local modules (not a library + example
  app, not Expo). Known cost: extraction into a package later — mitigated by
  keeping native code in isolated folders and exposing it only through a JS
  facade.
- Scope: Turbo Native Module, Fabric Native Component, C++ Turbo Module, Swift
  on iOS.
- **No automated tests** in this sample. Verification = successful builds +
  manual run on both platforms.

## Versions (latest as of 2026-09-25, verified via `npm view`)
- `react-native` 0.87.1 (React 19.x as pinned by the template)
- `@react-native-community/cli` 20.2.0 (scaffold)
- Hermes, bridgeless, Fabric, TurboModules: on by default — the legacy
  architecture no longer exists since 0.82, so there is no opt-in flag.
- Toolchain on machine: Node 26.7, JDK 17, Xcode 26.2, CocoaPods, Android SDK.

## Scaffold
Follow the current "Get Started Without a Framework" docs:
`npx @react-native-community/cli@20.2.0 init RNNewArchSample --version 0.87.1`,
then move the generated project to the repo root (keeping `docs/`).
Module/component code follows the current docs guides "Turbo Native Modules",
"Pure C++ Turbo Native Modules", and "Fabric Native Components".

## Layout
```
specs/                              # codegen specs (TypeScript) — single source of truth
  NativeSdkCore.ts                  # Turbo Native Module
  NativeSdkCrypto.ts                # C++ Turbo Native Module
  PayButtonNativeComponent.ts       # Fabric Native Component
shared/                             # C++ implementation of NativeSdkCrypto
  NativeSdkCrypto.h / .cpp
android/app/src/main/java/<pkg>/sdk/  # Kotlin: SdkCoreModule, PayButtonManager, PayButton view, SdkPackage
android/app/src/main/jni/           # CMakeLists.txt + OnLoad.cpp registering the C++ module
ios/Sdk/                            # Swift logic + thin ObjC++ (.mm) adapters
src/sdk/                            # typed JS facade — the only thing screens import
src/screens/                        # one demo screen per primitive
App.tsx                             # simple tab/segment switcher between screens
```
`package.json` `codegenConfig`: `name: "AppSpecs"`, `type: "all"`,
`jsSrcsDir: "specs"`, `android.javaPackageName`, and `ios.modulesProvider` /
`ios.componentProvider` mapping spec names to native classes.

## Components

### NativeSdkCore — Turbo Native Module (Kotlin / Swift)
| Member | Kind | Behaviour |
|---|---|---|
| `getConstants()` | sync | `{ sdkName: string, platform: string }` |
| `getSdkVersion(): string` | sync | returns native SDK version string |
| `initialize(config: {env: 'SANDBOX' \| 'PROD', appId: string}): Promise<void>` | async | rejects with code `E_INVALID_CONFIG` if `appId` empty; emits `onStatusChange('INITIALIZED')` |
| `createSession(amount: number, currency: string): Promise<{sessionId: string, expiresAt: number}>` | async | rejects `E_NOT_INITIALIZED` before init, `E_INVALID_AMOUNT` if amount <= 0; emits `SESSION_CREATED` |
| `onStatusChange` | `EventEmitter<{status: string}>` | codegen-typed event emitter (current docs pattern, not `NativeEventEmitter`) |

iOS: `RCTSdkCore.mm` conforms to the generated `NativeSdkCoreSpec` protocol and
forwards to `SdkCoreImpl.swift`. Android: `SdkCoreModule.kt` extends generated
`NativeSdkCoreSpec`, registered in `SdkPackage` (`BaseReactPackage`) added in
`MainApplication`.

### NativeSdkCrypto — C++ Turbo Native Module
- `sha256(input: string): string` (hex digest, self-contained implementation — no OpenSSL dependency)
- `luhnCheck(cardNumber: string): boolean` (ignores spaces/dashes; non-digits → false)

Single implementation in `shared/`, extending generated
`NativeSdkCryptoCxxSpec<T>`. Android: registered via `cxxModuleProvider` in
`jni/OnLoad.cpp` with an app `CMakeLists.txt`. iOS: added to the Xcode project
and exposed through the codegen module provider.

### PayButton — Fabric Native Component
- Props: `label: string`, `amount: string`, `disabled?: boolean`,
  `variant?: WithDefault<'primary' | 'outline', 'primary'>`
- Direct event: `onPayPress: DirectEventHandler<{timestamp: Double}>`
- View command: `setLoading(isLoading: boolean)` via `codegenNativeCommands`
- iOS: `RCTPayButtonComponentView.mm` (`RCTViewComponentView`) hosting a Swift
  `PayButtonView` (UIButton + activity indicator). Android: `PayButtonManager.kt`
  (`SimpleViewManager` + generated `PayButtonManagerInterface`/`Delegate`) and
  `PayButtonView.kt`.

### JS facade — `src/sdk/`
`SdkCore`, `SdkCrypto`, `PayButton` wrappers. Screens never import `specs/`
directly. Facade normalises native errors to a typed `SdkError { code, message }`
and exposes `subscribeStatus(cb) => unsubscribe`. This is the future package
boundary.

### Demo screens
- **Core:** show version/constants, Initialize button, Create Session (with a
  bad-amount button to show rejection), live status event log.
- **Crypto:** text input → SHA-256 output; card number input → Luhn result.
- **PayButton:** the native button; tap → JS triggers `setLoading(true)`,
  calls `createSession`, then `setLoading(false)`; toggles for `disabled` and
  `variant`.

## Error handling
Native async methods always settle (resolve or reject with a code). Sync
methods never throw for valid spec input. Facade converts rejections into
`SdkError`; screens render the error message instead of crashing.

## Verification (replaces tests, per user)
1. `npx tsc --noEmit` passes.
2. Codegen runs clean on both platforms (Gradle `generateCodegenArtifactsFromSchema`, `pod install`).
3. `cd android && ./gradlew assembleDebug` succeeds.
4. `xcodebuild` Debug build for iOS Simulator succeeds.
5. App launched on iOS simulator and Android emulator (if available) — each
   screen exercised; confirm bridgeless/Fabric at runtime via
   `global.RN$Bridgeless === true` and `global.nativeFabricUIManager` shown on
   the Core screen.

## Out of scope
Automated tests, library packaging/publishing, Expo, CI, real network calls.
