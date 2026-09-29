import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Pure C++ Turbo Native Module spec. One implementation in `shared/`
 * serves both platforms via the generated `NativeSdkCryptoCxxSpec<T>`.
 */
export interface Spec extends TurboModule {
  sha256(input: string): string;
  luhnCheck(cardNumber: string): boolean;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeSdkCrypto');
