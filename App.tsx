import { useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { CoreScreen } from './src/screens/CoreScreen';
import { CryptoScreen } from './src/screens/CryptoScreen';
import { PayButtonScreen } from './src/screens/PayButtonScreen';
import { UpiCheckoutScreen } from './src/screens/UpiCheckoutScreen';
import { colors } from './src/screens/ui';

const TABS = [
  { key: 'core', title: 'Turbo', Screen: CoreScreen },
  { key: 'crypto', title: 'C++', Screen: CryptoScreen },
  { key: 'fabric', title: 'Fabric', Screen: PayButtonScreen },
  { key: 'upi', title: 'UPI', Screen: UpiCheckoutScreen },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<TabKey>('core');
  const { Screen } = TABS.find(tab => tab.key === active) ?? TABS[0];

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <Text style={styles.title}>New Architecture Sample</Text>
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map(tab => {
          const selected = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setActive(tab.key)}
              style={[styles.tab, selected && styles.tabSelected]}
            >
              <Text
                style={[styles.tabText, selected && styles.tabTextSelected]}
              >
                {tab.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.body}>
        <Screen />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tabs: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 0,
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabSelected: { backgroundColor: colors.surface },
  tabText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  tabTextSelected: { color: colors.brand },
  body: { flex: 1 },
});

export default App;
