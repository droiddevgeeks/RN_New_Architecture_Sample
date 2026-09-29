import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SdkCore, SdkError } from '../sdk';
import type { SdkSession } from '../sdk';
import { getArchitectureInfo } from '../runtime/architecture';
import { isCashfreeTurboModuleAvailable } from '../payments/CashfreeUpiCheckout';
import { ActionButton, Card, Row, colors } from './ui';

type Result =
  | { kind: 'idle' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string };

function describe(error: unknown): string {
  return error instanceof SdkError
    ? `${error.code}: ${error.message}`
    : String(error);
}

export function CoreScreen() {
  const [events, setEvents] = useState<string[]>([]);
  const [result, setResult] = useState<Result>({ kind: 'idle' });
  const [session, setSession] = useState<SdkSession | null>(null);

  const arch = getArchitectureInfo();
  const cashfreeTurboModule = isCashfreeTurboModuleAvailable();
  const constants = SdkCore.getConstants();
  const version = SdkCore.getVersion();

  useEffect(
    () =>
      SdkCore.subscribeStatus(status =>
        setEvents(prev =>
          [`${new Date().toLocaleTimeString()}  ${status}`, ...prev].slice(
            0,
            20,
          ),
        ),
      ),
    [],
  );

  const run = async (label: string, action: () => Promise<string>) => {
    try {
      setResult({ kind: 'ok', message: `${label}: ${await action()}` });
    } catch (error) {
      setResult({ kind: 'error', message: describe(error) });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card title="RUNTIME">
        <Row
          label="Bridgeless"
          value={String(arch.bridgeless)}
          tone={arch.bridgeless ? 'success' : 'danger'}
        />
        <Row
          label="Fabric renderer"
          value={String(arch.fabric)}
          tone={arch.fabric ? 'success' : 'danger'}
        />
        <Row
          label="Cashfree TurboModule"
          value={String(cashfreeTurboModule)}
          tone={cashfreeTurboModule ? 'success' : 'danger'}
        />
      </Card>

      <Card title="SYNC CALLS (JSI)">
        <Row label="getSdkVersion()" value={version} />
        <Row label="sdkName" value={constants.sdkName} />
        <Row label="platform" value={constants.platform} />
      </Card>

      <Card title="ASYNC CALLS (PROMISE)">
        <ActionButton
          title="initialize({env: 'SANDBOX'})"
          onPress={() =>
            run('initialize', async () => {
              await SdkCore.initialize({ env: 'SANDBOX', appId: 'demo-app' });
              return 'ok';
            })
          }
        />
        <ActionButton
          kind="ghost"
          title="initialize({appId: ''}) → rejects"
          onPress={() =>
            run('initialize', async () => {
              await SdkCore.initialize({ env: 'SANDBOX', appId: '' });
              return 'ok';
            })
          }
        />
        <ActionButton
          title="createSession(499, 'INR')"
          onPress={() =>
            run('createSession', async () => {
              const created = await SdkCore.createSession(499, 'INR');
              setSession(created);
              return created.sessionId;
            })
          }
        />
        <ActionButton
          kind="ghost"
          title="createSession(0, 'INR') → rejects"
          onPress={() =>
            run(
              'createSession',
              async () => (await SdkCore.createSession(0, 'INR')).sessionId,
            )
          }
        />
        {result.kind !== 'idle' && (
          <Text
            style={[
              styles.result,
              { color: result.kind === 'ok' ? colors.success : colors.danger },
            ]}
          >
            {result.message}
          </Text>
        )}
        {session && (
          <Row
            label="expiresAt"
            value={new Date(session.expiresAt).toLocaleTimeString()}
          />
        )}
      </Card>

      <Card title="EVENTS (onStatusChange)">
        {events.length === 0 ? (
          <Text style={styles.muted}>No events yet — call initialize().</Text>
        ) : (
          events.map((line, index) => (
            <Text key={`${index}-${line}`} style={styles.event}>
              {line}
            </Text>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  result: { fontSize: 13, fontWeight: '600' },
  muted: { color: colors.muted },
  event: { fontFamily: 'Menlo', fontSize: 12, color: colors.text },
});
