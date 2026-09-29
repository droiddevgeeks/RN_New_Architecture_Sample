import NativeSdkCrypto from '../../specs/NativeSdkCrypto';

/** Facade over the shared C++ `NativeSdkCrypto` Turbo Module. Both calls are synchronous. */
export const SdkCrypto = {
  /** Lower-case hex SHA-256 of the UTF-8 input. */
  sha256(input: string): string {
    return NativeSdkCrypto.sha256(input);
  },

  /** Luhn checksum; spaces and dashes are ignored, requires 12–19 digits. */
  luhnCheck(cardNumber: string): boolean {
    return NativeSdkCrypto.luhnCheck(cardNumber);
  },
};
