import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Turbo Native Module spec. Codegen turns this into:
 *  - Android: abstract `NativeSdkCoreSpec` (Kotlin/Java) in `com.rnnewarchsample.specs`
 *  - iOS: `NativeSdkCoreSpec` protocol + `NativeSdkCoreSpecBase` in `AppSpecs/AppSpecs.h`
 */

export type SdkConfig = {
  /** 'SANDBOX' | 'PROD' — validated natively (codegen modules don't support string unions). */
  env: string;
  appId: string;
};

export type SdkSession = {
  sessionId: string;
  /** Epoch millis. */
  expiresAt: number;
};

export type SdkStatusEvent = {
  status: string;
};

export interface Spec extends TurboModule {
  getConstants(): {
    sdkName: string;
    platform: string;
    /** Whether RN's legacy-module interop layer is on (read from native, not JS). */
    legacyModuleInterop: boolean;
  };
  getSdkVersion(): string;
  initialize(config: SdkConfig): Promise<void>;
  createSession(amount: number, currency: string): Promise<SdkSession>;
  readonly onStatusChange: CodegenTypes.EventEmitter<SdkStatusEvent>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeSdkCore');
