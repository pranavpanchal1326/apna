import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'

/**
 * apna — Root Entry Point
 *
 * Prompt 0.1: Minimal bootstrap screen confirming the project runs.
 * Prompt 0.5: This file will be replaced with RootNavigator + QueryClientProvider + Sentry.
 */
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>apna</Text>
      <Text style={styles.subtitle}>Foundation ready ✅</Text>
      <Text style={styles.caption}>Prompt 0.2 → Design System next</Text>
      <StatusBar style="light" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C14',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4ECDC4',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  caption: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
})
