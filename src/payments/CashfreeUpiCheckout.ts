import { TurboModuleRegistry } from 'react-native';
import {
  CFEnvironment,
  CFSession,
  CFThemeBuilder,
  CFUPI,
  CFUPIIntentCheckoutPayment,
  CFUPIPayment,
  UPIMode,
} from 'cashfree-pg-api-contract';
import { CFPaymentGatewayService } from 'react-native-cashfree-pg-sdk';
import type { CFErrorResponse } from 'react-native-cashfree-pg-sdk';

export type CheckoutEnvironment = 'SANDBOX' | 'PRODUCTION';

export type UpiCheckoutRequest = {
  orderId: string;
  paymentSessionId: string;
  environment: CheckoutEnvironment;
};

/**
 * `makePayment` UPI Intent request. `appId` is the app identifier from
 * `getInstalledUpiApps()` (Android package name / iOS app id).
 */
export type UpiIntentPaymentRequest = UpiCheckoutRequest & { appId: string };

export type UpiApp = {
  name: string;
  /** Pass as `appId` for an INTENT `makePayment`. */
  id: string;
};

/**
 * `VERIFY` does NOT mean paid — the SDK only says the flow finished.
 * The merchant backend must confirm the order status with Cashfree before
 * treating it as successful.
 */
export type UpiCheckoutResult =
  | { status: 'VERIFY'; orderId: string }
  | {
      status: 'ERROR';
      orderId: string;
      code: string;
      message: string;
      type: string;
    };

export class UpiCheckoutError extends Error {
  readonly code:
    | 'E_INVALID_INPUT'
    | 'E_IN_PROGRESS'
    | 'E_NATIVE_MODULE_MISSING'
    | 'E_UPI_APPS';

  constructor(code: UpiCheckoutError['code'], message: string) {
    super(message);
    this.name = 'UpiCheckoutError';
    this.code = code;
  }
}

/** True when the SDK's `CashfreePgApi` TurboModule is registered (the lookup the SDK itself uses). */
export function isCashfreeTurboModuleAvailable(): boolean {
  return TurboModuleRegistry.get('CashfreePgApi') != null;
}

const UPI_APPS_TIMEOUT_MS = 5000;

// The SDK keeps a single global callback, so only one checkout can be in flight.
let inFlight = false;

function validateSession(request: UpiCheckoutRequest): CFSession {
  const orderId = request.orderId.trim();
  const paymentSessionId = request.paymentSessionId.trim();
  // Native code crashes on a bad session (iOS force-unwraps it; Android
  // element flow throws IllegalStateException out of the @ReactMethod).
  // Reject here, before native is touched.
  if (!orderId || !paymentSessionId) {
    throw new UpiCheckoutError(
      'E_INVALID_INPUT',
      'orderId and paymentSessionId are required',
    );
  }
  return new CFSession(
    paymentSessionId,
    orderId,
    request.environment === 'PRODUCTION'
      ? CFEnvironment.PRODUCTION
      : CFEnvironment.SANDBOX,
  );
}

function assertLinked() {
  if (!isCashfreeTurboModuleAvailable()) {
    throw new UpiCheckoutError(
      'E_NATIVE_MODULE_MISSING',
      'CashfreePgApi native module is not linked — rebuild the app',
    );
  }
}

/**
 * Registers the SDK's global callback, runs `launch`, and resolves on the
 * first onVerify/onError. Shared by the drop-in and element flows.
 */
function runWithCallback(launch: () => void): Promise<UpiCheckoutResult> {
  if (inFlight) {
    return Promise.reject(
      new UpiCheckoutError(
        'E_IN_PROGRESS',
        'A checkout is already in progress',
      ),
    );
  }
  inFlight = true;

  return new Promise<UpiCheckoutResult>((resolve, reject) => {
    const settle = (result: UpiCheckoutResult) => {
      inFlight = false;
      CFPaymentGatewayService.removeCallback();
      resolve(result);
    };

    CFPaymentGatewayService.setCallback({
      onVerify(verifiedOrderId: string) {
        settle({ status: 'VERIFY', orderId: verifiedOrderId });
      },
      onError(error: CFErrorResponse, failedOrderId: string) {
        settle({
          status: 'ERROR',
          orderId: failedOrderId,
          code: error.getCode(),
          message: error.getMessage(),
          type: error.getType(),
        });
      },
    });

    try {
      launch();
    } catch (error) {
      inFlight = false;
      CFPaymentGatewayService.removeCallback();
      reject(error);
    }
  });
}

/**
 * Drop-in UPI Intent checkout (`doUPIPayment`): Cashfree renders its own
 * "Select UPI Application" sheet.
 */
export function startUpiIntentCheckout(
  request: UpiCheckoutRequest,
): Promise<UpiCheckoutResult> {
  try {
    assertLinked();
    const session = validateSession(request);
    const theme = new CFThemeBuilder()
      .setNavigationBarBackgroundColor('#6B45F2')
      .setNavigationBarTextColor('#FFFFFF')
      .setButtonBackgroundColor('#6B45F2')
      .setButtonTextColor('#FFFFFF')
      .setPrimaryTextColor('#16161D')
      .setSecondaryTextColor('#6B6B7B')
      .build();
    return runWithCallback(() =>
      CFPaymentGatewayService.doUPIPayment(
        new CFUPIIntentCheckoutPayment(session, theme),
      ),
    );
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * Element UPI Intent payment (`makePayment(new CFUPIPayment(...))`): the app
 * renders its own UPI app picker and the SDK hands off to the chosen app.
 */
export function startUpiIntentPayment(
  request: UpiIntentPaymentRequest,
): Promise<UpiCheckoutResult> {
  try {
    assertLinked();
    const session = validateSession(request);
    const appId = request.appId.trim();
    if (!appId) {
      throw new UpiCheckoutError('E_INVALID_INPUT', 'Pick a UPI app');
    }
    const upi = new CFUPI(UPIMode.INTENT, appId);
    return runWithCallback(() =>
      CFPaymentGatewayService.makePayment(new CFUPIPayment(session, upi)),
    );
  } catch (error) {
    return Promise.reject(error);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseUpiApps(raw: unknown): UpiApp[] {
  const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!Array.isArray(parsed)) {
    throw new UpiCheckoutError('E_UPI_APPS', 'Unexpected UPI app list');
  }
  return parsed.flatMap(item =>
    isRecord(item) &&
    typeof item.appPackage === 'string' &&
    item.appPackage.length > 0
      ? [
          {
            id: item.appPackage,
            name:
              typeof item.appName === 'string' && item.appName
                ? item.appName
                : item.appPackage,
          },
        ]
      : [],
  );
}

/**
 * Installed UPI apps as reported by the SDK (Android: Callback; iOS: the
 * `cfUpiApps` event). Times out because on iOS the SDK's listener is torn
 * down by `removeCallback()`, which would otherwise leave this pending forever.
 */
export async function getInstalledUpiApps(): Promise<UpiApp[]> {
  assertLinked();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new UpiCheckoutError('E_UPI_APPS', 'Timed out listing UPI apps'),
        ),
      UPI_APPS_TIMEOUT_MS,
    );
  });
  try {
    const raw = await Promise.race([
      CFPaymentGatewayService.getInstalledUpiApps(),
      timeout,
    ]);
    return parseUpiApps(raw);
  } catch (error) {
    if (error instanceof UpiCheckoutError) {
      throw error;
    }
    // The SDK rejects with a bare string ('No UPI apps found').
    throw new UpiCheckoutError('E_UPI_APPS', String(error));
  } finally {
    clearTimeout(timer);
  }
}
