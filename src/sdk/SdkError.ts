/** Normalised error surfaced by every async SDK call. `code` mirrors the native reject code. */
export class SdkError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'SdkError';
    this.code = code;
  }
}

export function toSdkError(error: unknown): SdkError {
  if (error instanceof SdkError) {
    return error;
  }
  if (error instanceof Error) {
    const code =
      'code' in error && typeof error.code === 'string'
        ? error.code
        : 'E_UNKNOWN';
    return new SdkError(code, error.message);
  }
  return new SdkError('E_UNKNOWN', String(error));
}
