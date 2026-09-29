import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { PayButton, SdkCore, SdkError } from '../sdk';
import type { PayButtonHandle } from '../sdk';
import { Card, Row, colors } from './ui';

export function PayButtonScreen() {
  const buttonRef = useRef<PayButtonHandle>(null);
  const [disabled, setDisabled] = useState(false);
  const [outline, setOutline] = useState(false);
  const [lastPress, setLastPress] = useState<string>('—');
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  const handlePress = async ({ timestamp }: { timestamp: number }) => {
    setLastPress(new Date(timestamp).toLocaleTimeString());
    buttonRef.current?.setLoading(true);
    try {
      // Idempotent on the native side; lets this screen work without visiting Core first.
      await SdkCore.initialize({ env: 'SANDBOX', appId: 'demo-app' });
      const session = await SdkCore.createSession(499, 'INR');
      setStatus({ ok: true, message: session.sessionId });
    } catch (error) {
      setStatus({
        ok: false,
        message:
          error instanceof SdkError
            ? `${error.code}: ${error.message}`
            : String(error),
      });
    } finally {
      buttonRef.current?.setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card title="FABRIC NATIVE COMPONENT">
        <PayButton
          ref={buttonRef}
          label="Pay"
          amount="₹499.00"
          disabled={disabled}
          variant={outline ? 'outline' : 'primary'}
          onPress={handlePress}
        />
        <Text style={styles.note}>
          Tap → native direct event onPayPress → JS sends setLoading(true) view
          command → createSession() → setLoading(false).
        </Text>
      </Card>

      <Card title="PROPS">
        <View style={styles.toggle}>
          <Text style={styles.toggleLabel}>disabled</Text>
          <Switch value={disabled} onValueChange={setDisabled} />
        </View>
        <View style={styles.toggle}>
          <Text style={styles.toggleLabel}>variant = outline</Text>
          <Switch value={outline} onValueChange={setOutline} />
        </View>
      </Card>

      <Card title="RESULT">
        <Row label="Last onPayPress" value={lastPress} />
        {status && (
          <Row
            label={status.ok ? 'sessionId' : 'error'}
            value={status.message}
            tone={status.ok ? 'success' : 'danger'}
          />
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: { color: colors.text, fontSize: 15 },
});
