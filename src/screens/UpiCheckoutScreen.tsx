import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  UpiCheckoutError,
  getCashfreeLinkStatus,
  getInstalledUpiApps,
  startUpiIntentCheckout,
  startUpiIntentPayment,
} from '../payments/CashfreeUpiCheckout';
import type {
  UpiApp,
  UpiCheckoutRequest,
  UpiCheckoutResult,
} from '../payments/CashfreeUpiCheckout';
import {
  SandboxOrderError,
  createSandboxOrder,
  isSandboxOrderAvailable,
} from '../dev/createSandboxOrder';
import { ActionButton, Card, Row, colors } from './ui';

type Outcome =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'result'; result: UpiCheckoutResult }
  | { kind: 'error'; message: string };

export function UpiCheckoutScreen() {
  const [orderId, setOrderId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [production, setProduction] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const [orderStatus, setOrderStatus] = useState<
    { ok: boolean; message: string } | { creating: true } | null
  >(null);

  const [apps, setApps] = useState<UpiApp[] | null>(null);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const link = getCashfreeLinkStatus();

  const loadApps = useCallback(async () => {
    setAppsError(null);
    try {
      const installed = await getInstalledUpiApps();
      setApps(installed);
      setSelectedAppId(current =>
        current && installed.some(app => app.id === current)
          ? current
          : installed[0]?.id ?? null,
      );
    } catch (error) {
      setApps([]);
      setAppsError(
        error instanceof UpiCheckoutError
          ? `${error.code}: ${error.message}`
          : String(error),
      );
    }
  }, []);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const createOrder = async () => {
    setOrderStatus({ creating: true });
    try {
      const order = await createSandboxOrder(1);
      setOrderId(order.orderId);
      setSessionId(order.paymentSessionId);
      setProduction(false);
      setOrderStatus({ ok: true, message: `Created ${order.orderId}` });
    } catch (error) {
      setOrderStatus({
        ok: false,
        message:
          error instanceof SandboxOrderError
            ? `${error.code}: ${error.message}`
            : String(error),
      });
    }
  };

  const run = async (
    launch: (base: UpiCheckoutRequest) => Promise<UpiCheckoutResult>,
  ) => {
    setOutcome({ kind: 'running' });
    try {
      const result = await launch({
        orderId,
        paymentSessionId: sessionId,
        environment: production ? 'PRODUCTION' : 'SANDBOX',
      });
      setOutcome({ kind: 'result', result });
    } catch (error) {
      setOutcome({
        kind: 'error',
        message:
          error instanceof UpiCheckoutError
            ? `${error.code}: ${error.message}`
            : String(error),
      });
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Card title="CASHFREE NATIVE MODULE">
        <Row
          label="TurboModuleRegistry.get"
          value={String(link.turboModule)}
          tone={link.turboModule ? 'success' : 'danger'}
        />
        <Row
          label="NativeModules (legacy lookup)"
          value={String(link.nativeModules)}
        />
      </Card>

      <Card title="ORDER (CREATED SERVER-SIDE)">
        {isSandboxOrderAvailable && (
          <>
            <ActionButton
              kind="ghost"
              title="Create ₹1 sandbox order & prefill (dev only)"
              onPress={createOrder}
            />
            {orderStatus && 'creating' in orderStatus && (
              <Text style={styles.note}>Creating sandbox order…</Text>
            )}
            {orderStatus && 'ok' in orderStatus && (
              <Text style={orderStatus.ok ? styles.ok : styles.error}>
                {orderStatus.message}
              </Text>
            )}
          </>
        )}
        <TextInput
          style={styles.input}
          placeholder="order_id"
          placeholderTextColor={colors.muted}
          value={orderId}
          onChangeText={setOrderId}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="payment_session_id"
          placeholderTextColor={colors.muted}
          value={sessionId}
          onChangeText={setSessionId}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.toggle}>
          <Text style={styles.toggleLabel}>Production environment</Text>
          <Switch value={production} onValueChange={setProduction} />
        </View>
        <Text style={styles.note}>
          Real apps get both from their backend — the client secret never ships
          in a release build.
        </Text>
        <ActionButton
          title="Drop-in UPI checkout (doUPIPayment)"
          onPress={() => run(startUpiIntentCheckout)}
        />
      </Card>

      <Card title="UPI INTENT PAYMENT (makePayment)">
        <Text style={styles.label}>Installed UPI apps</Text>
        {apps === null && <Text style={styles.note}>Loading UPI apps…</Text>}
        {apps?.length === 0 && (
          <Text style={styles.note}>
            {appsError ?? 'No UPI apps installed on this device.'}
          </Text>
        )}
        {apps?.map(app => {
          const selected = app.id === selectedAppId;
          return (
            <Pressable
              key={app.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setSelectedAppId(app.id)}
              style={[styles.app, selected && styles.appSelected]}
            >
              <Text style={styles.appName}>{app.name}</Text>
              <Text style={styles.appId}>{app.id}</Text>
            </Pressable>
          );
        })}
        <ActionButton
          kind="ghost"
          title="Refresh UPI apps"
          onPress={loadApps}
        />
        <ActionButton
          title="Pay with selected app"
          onPress={() =>
            run(base =>
              startUpiIntentPayment({ ...base, appId: selectedAppId ?? '' }),
            )
          }
        />
      </Card>

      {outcome.kind !== 'idle' && (
        <Card title="RESULT">
          {outcome.kind === 'running' && (
            <Text style={styles.note}>Waiting for SDK callback…</Text>
          )}
          {outcome.kind === 'error' && (
            <Text style={styles.error}>{outcome.message}</Text>
          )}
          {outcome.kind === 'result' && outcome.result.status === 'VERIFY' && (
            <>
              <Row
                label="onVerify"
                value={outcome.result.orderId}
                tone="success"
              />
              <Text style={styles.note}>
                Confirm the order status on your backend before fulfilling.
              </Text>
            </>
          )}
          {outcome.kind === 'result' && outcome.result.status === 'ERROR' && (
            <>
              <Row label="onError" value={outcome.result.code} tone="danger" />
              <Row label="message" value={outcome.result.message} />
              <Row label="type" value={outcome.result.type} />
              <Row label="orderId" value={outcome.result.orderId || '—'} />
            </>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: { color: colors.text, fontSize: 15 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  ok: { color: colors.success, fontSize: 13, fontWeight: '600' },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  app: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  appSelected: { borderColor: colors.brand, borderWidth: 2 },
  appName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  appId: { color: colors.muted, fontSize: 12 },
});
