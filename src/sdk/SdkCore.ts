import NativeSdkCore from '../../specs/NativeSdkCore';
import type { SdkSession } from '../../specs/NativeSdkCore';
import { toSdkError } from './SdkError';

export type { SdkSession };

export type SdkEnvironment = 'SANDBOX' | 'PROD';

export type SdkInitConfig = {
  env: SdkEnvironment;
  appId: string;
};

export type SdkStatus =
  | 'INITIALIZED'
  | 'CREATING_SESSION'
  | 'SESSION_CREATED'
  | (string & {});

/**
 * Typed facade over the `NativeSdkCore` Turbo Module. Screens (and, later,
 * consumers of the extracted package) use this — never the spec directly.
 */
export const SdkCore = {
  getConstants() {
    return NativeSdkCore.getConstants();
  },

  /** Synchronous JSI call — returns without a Promise or bridge round-trip. */
  getVersion(): string {
    return NativeSdkCore.getSdkVersion();
  },

  async initialize(config: SdkInitConfig): Promise<void> {
    try {
      await NativeSdkCore.initialize(config);
    } catch (error) {
      throw toSdkError(error);
    }
  },

  async createSession(amount: number, currency: string): Promise<SdkSession> {
    try {
      return await NativeSdkCore.createSession(amount, currency);
    } catch (error) {
      throw toSdkError(error);
    }
  },

  /** Subscribes to the codegen-typed `onStatusChange` emitter. Returns an unsubscribe fn. */
  subscribeStatus(listener: (status: SdkStatus) => void): () => void {
    const subscription = NativeSdkCore.onStatusChange(event =>
      listener(event.status),
    );
    return () => subscription.remove();
  },
};
