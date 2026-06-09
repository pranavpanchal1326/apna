// src/screens/debug/NotificationDebugScreen.tsx
import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Linking, ScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Screen, Header, Button } from '@components'
import { useTheme } from '@theme'
import { useNotificationStore } from '@stores/notification.store'
import { getNotificationPermissionState, requestNotificationPermission, syncPushTokenIfNeeded } from '@lib/notifications'
import { useAuthStore } from '@stores/auth.store'

export function NotificationDebugScreen() {
  const { colors, text, spacing, radius } = useTheme()
  const navigation = useNavigation()
  const user = useAuthStore((s) => s.user)
  const uid = user?.uid ?? null
  const { token, isRegistering } = useNotificationStore()
  const [permState, setPermState] = useState<string>('checking...')

  const fetchPerms = useCallback(async () => {
    const perm = await getNotificationPermissionState()
    setPermState(`status: ${perm.status}, granted: ${perm.granted}, canAskAgain: ${perm.canAskAgain}`)
  }, [])

  useEffect(() => {
    fetchPerms()
  }, [fetchPerms])

  const handleRequestPerm = async () => {
    const res = await requestNotificationPermission()
    setPermState(`status: ${res.status}, granted: ${res.granted}, canAskAgain: ${res.canAskAgain}`)
  }

  const handleSyncToken = async () => {
    if (uid) {
      await syncPushTokenIfNeeded(uid)
      await fetchPerms()
    }
  }

  const handleSimulateExpense = () => {
    Linking.openURL('apna://group/test-group-123/expense/test-expense-456')
  }

  const handleSimulateSettings = () => {
    Linking.openURL('apna://group/test-group-123/settings')
  }

  return (
    <Screen>
      <Header title="Notification Debug" showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={[styles.card, { backgroundColor: colors.bgSecondary, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md }]}>
          <Text style={[text.heading.sm, { color: colors.textPrimary, marginBottom: spacing.xs }]}>Permission State</Text>
          <Text style={[text.body.sm, { color: colors.textSecondary }]}>{permState}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.bgSecondary, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md }]}>
          <Text style={[text.heading.sm, { color: colors.textPrimary, marginBottom: spacing.xs }]}>Token Info</Text>
          <Text style={[text.body.sm, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Registered: {token ? 'Yes' : 'No'}</Text>
          <Text style={[text.body.sm, { color: colors.textSecondary, fontFamily: 'monospace' }]}>{token || 'none'}</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <Button
            variant="primary"
            label="Request Permission"
            onPress={handleRequestPerm}
            loading={isRegistering}
          />
          <Button
            variant="secondary"
            label="Sync Token Now"
            onPress={handleSyncToken}
            loading={isRegistering}
          />
          <Button
            variant="secondary"
            label="Simulate Expense Deep Link"
            onPress={handleSimulateExpense}
          />
          <Button
            variant="secondary"
            label="Simulate Settings Deep Link"
            onPress={handleSimulateSettings}
          />
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
})
