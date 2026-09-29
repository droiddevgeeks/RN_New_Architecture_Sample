/**
 * DEV-ONLY stand-in for the merchant backend: creates a Cashfree SANDBOX order
 * straight from the app so the UPI tab can be prefilled.
 *
 * A real integration must create orders server-side — the client secret must
 * never ship in an app. This file is safe only because:
 *  - the keys are sandbox test keys kept in a gitignored file,
 *  - that file is required inside a `__DEV__` branch, which Metro strips from
 *    release bundles,
 *  - the URL is hard-coded to the sandbox host.
 */

const SANDBOX_ORDERS_URL = 'https://sandbox.cashfree.com/pg/orders';
const REQUEST_TIMEOUT_MS = 15_000;

type SandboxCredentials = { clientId: string; clientSecret: string };

export type SandboxOrder = { orderId: string; paymentSessionId: string };

export class SandboxOrderError extends Error {
  readonly code: 'E_UNAVAILABLE' | 'E_NO_CREDENTIALS' | 'E_API' | 'E_NETWORK';

  constructor(code: SandboxOrderError['code'], message: string) {
    super(message);
    this.name = 'SandboxOrderError';
    this.code = code;
  }
}

function loadCredentials(): SandboxCredentials | null {
  // The require MUST sit inside a literal `if (__DEV__)` block: Metro folds it
  // to `if (false)` in release and drops the module. An early-return guard
  // does NOT work — the module stays in the release bundle.
  if (__DEV__) {
    const credentials: SandboxCredentials =
      require('./cashfreeSandbox.local').default;
    return credentials.clientId && credentials.clientSecret
      ? credentials
      : null;
  }
  return null;
}

export const isSandboxOrderAvailable = __DEV__;

type CreateOrderResponse = {
  order_id?: unknown;
  payment_session_id?: unknown;
  message?: unknown;
  code?: unknown;
};

export async function createSandboxOrder(
  amount: number,
): Promise<SandboxOrder> {
  if (!__DEV__) {
    throw new SandboxOrderError('E_UNAVAILABLE', 'Sandbox orders are dev-only');
  }
  if (!(amount > 0) || !Number.isFinite(amount)) {
    throw new SandboxOrderError('E_API', 'amount must be > 0');
  }
  const credentials = loadCredentials();
  if (!credentials) {
    throw new SandboxOrderError(
      'E_NO_CREDENTIALS',
      'Fill src/dev/cashfreeSandbox.local.ts with sandbox keys',
    );
  }

  // RN's fetch has no default timeout: without this, an offline device spins
  // forever instead of surfacing an error.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(SANDBOX_ORDERS_URL, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-version': '2025-01-01',
        'x-client-id': credentials.clientId,
        'x-client-secret': credentials.clientSecret,
      },
      body: JSON.stringify({
        order_id: `rn_newarch_${Date.now()}`,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: 'rn_newarch_sample',
          customer_phone: '9876543210',
        },
      }),
    });
  } catch (error) {
    throw new SandboxOrderError(
      'E_NETWORK',
      controller.signal.aborted
        ? `No response from Cashfree sandbox after ${
            REQUEST_TIMEOUT_MS / 1000
          }s — check the device's internet`
        : `Network error: ${String(error)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  let body: CreateOrderResponse;
  try {
    body = (await response.json()) as CreateOrderResponse;
  } catch {
    throw new SandboxOrderError(
      'E_API',
      `HTTP ${response.status}: non-JSON response`,
    );
  }

  if (
    !response.ok ||
    typeof body.order_id !== 'string' ||
    typeof body.payment_session_id !== 'string'
  ) {
    const message =
      typeof body.message === 'string' ? body.message : 'unexpected response';
    throw new SandboxOrderError('E_API', `HTTP ${response.status}: ${message}`);
  }
  return { orderId: body.order_id, paymentSessionId: body.payment_session_id };
}
