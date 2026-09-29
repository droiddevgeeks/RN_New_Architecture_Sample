import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SdkCrypto } from '../sdk';
import { Card, Row, colors } from './ui';

export function CryptoScreen() {
  const [text, setText] = useState('hello new architecture');
  const [card, setCard] = useState('4111 1111 1111 1111');

  // Both are synchronous C++ calls over JSI, cheap enough to run on every keystroke.
  const digest = useMemo(() => SdkCrypto.sha256(text), [text]);
  const luhnValid = useMemo(() => SdkCrypto.luhnCheck(card), [card]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Card title="SHA-256 (SHARED C++)">
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          autoCapitalize="none"
        />
        <Text selectable style={styles.mono}>
          {digest}
        </Text>
      </Card>

      <Card title="LUHN CHECK (SHARED C++)">
        <TextInput
          style={styles.input}
          value={card}
          onChangeText={setCard}
          keyboardType="number-pad"
        />
        <Row
          label="luhnCheck()"
          value={luhnValid ? 'valid' : 'invalid'}
          tone={luhnValid ? 'success' : 'danger'}
        />
      </Card>

      <Text style={styles.note}>
        One implementation in shared/NativeSdkCrypto.cpp, compiled into both
        apps and registered through the iOS module provider and Android's
        OnLoad.cpp.
      </Text>
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
    fontSize: 15,
    color: colors.text,
  },
  mono: { fontFamily: 'Menlo', fontSize: 12, color: colors.text },
  note: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
});
