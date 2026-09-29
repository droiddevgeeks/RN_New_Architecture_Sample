import type * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const colors = {
  brand: '#6B45F2',
  text: '#16161D',
  muted: '#6B6B7B',
  border: '#E4E4EC',
  surface: '#FFFFFF',
  background: '#F5F5FA',
  success: '#1F9D55',
  danger: '#D64545',
};

export function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'danger';
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        selectable
        style={[styles.rowValue, tone ? { color: colors[tone] } : null]}
      >
        {value}
      </Text>
    </View>
  );
}

export function ActionButton({
  title,
  onPress,
  kind = 'primary',
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        kind === 'ghost' ? styles.actionGhost : styles.actionPrimary,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={kind === 'ghost' ? styles.actionGhostText : styles.actionText}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { color: colors.muted, fontSize: 14 },
  rowValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  action: {
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  actionPrimary: { backgroundColor: colors.text },
  actionGhost: { borderWidth: 1, borderColor: colors.border },
  actionText: { color: '#fff', fontWeight: '600' },
  actionGhostText: { color: colors.text, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
