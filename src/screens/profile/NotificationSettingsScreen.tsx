// src/screens/profile/NotificationSettingsScreen.tsx
// Per-type notification toggles + configurable silent hours (PRD §18).
// Preferences live on users/{uid}.notificationPrefs and are enforced
// server-side at send time. SOS alerts always deliver.

import { useCallback, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { updateDoc } from 'firebase/firestore'
import * as Haptics from 'expo-haptics'
import { Screen, Header } from '@components'
import { SettingsRow } from '@components/group'
import { Warning } from 'phosphor-react-native'
import { useTheme } from '@theme'
import { useAuth } from '@hooks/useAuth'
import { userDoc } from '@lib/firebase/collections'
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from '@lib/schemas'

const CATEGORY_ROWS: { key: keyof Omit<NotificationPrefs, 'silentHours'>; label: string; description: string }[] = [
  { key: 'expenses',     label: 'Expenses',      description: 'New and updated expenses, budget alerts' },
  { key: 'settlements',  label: 'Settlements',   description: 'When someone settles up with you' },
  { key: 'memories',     label: 'Memories',      description: 'Reactions to your photos, On This Day' },
  { key: 'itinerary',    label: 'Itinerary',     description: 'Plan reminders and trip updates' },
  { key: 'groupUpdates', label: 'Group updates', description: 'Members joining, admin changes' },
]

function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display} ${period}`
}

export function NotificationSettingsScreen() {
  const { colors, text, spacing, radius } = useTheme()
  const navigation = useNavigation()
  const { user } = useAuth()

  const [prefs, setPrefs] = useState<NotificationPrefs>({
    ...DEFAULT_NOTIFICATION_PREFS,
    ...(user?.notificationPrefs ?? {}),
    silentHours: {
      ...DEFAULT_NOTIFICATION_PREFS.silentHours,
      ...(user?.notificationPrefs?.silentHours ?? {}),
    },
  })

  // Optimistic local update + Firestore persist; revert on failure
  const persist = useCallback(
    async (next: NotificationPrefs, prev: NotificationPrefs) => {
      if (!user?.uid) return
      setPrefs(next)
      try {
        await updateDoc(userDoc(user.uid), { notificationPrefs: next } as never)
      } catch {
        setPrefs(prev)
        Alert.alert('Error', 'Could not save your preferences. Please try again.')
      }
    },
    [user?.uid],
  )

  const toggleCategory = (key: keyof Omit<NotificationPrefs, 'silentHours'>) => (value: boolean) => {
    Haptics.selectionAsync()
    persist({ ...prefs, [key]: value }, prefs)
  }

  const toggleSilent = (value: boolean) => {
    Haptics.selectionAsync()
    persist({ ...prefs, silentHours: { ...prefs.silentHours, enabled: value } }, prefs)
  }

  const stepHour = (which: 'startHour' | 'endHour') => {
    Haptics.selectionAsync()
    const next = {
      ...prefs,
      silentHours: {
        ...prefs.silentHours,
        [which]: (prefs.silentHours[which] + 1) % 24,
      },
    }
    persist(next, prefs)
  }

  return (
    <Screen>
      <Header title="Notifications" showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Per-type toggles */}
        <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          NOTIFY ME ABOUT
        </Text>
        <View style={{ marginBottom: spacing.xl }}>
          {CATEGORY_ROWS.map((row) => (
            <SettingsRow
              key={row.key}
              label={row.label}
              description={row.description}
              value={prefs[row.key]}
              onToggle={toggleCategory(row.key)}
            />
          ))}
        </View>

        {/* Silent hours */}
        <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          SILENT HOURS
        </Text>
        <View style={{ marginBottom: spacing.md }}>
          <SettingsRow
            label="Silent hours"
            description="Pause non-urgent notifications overnight"
            value={prefs.silentHours.enabled}
            onToggle={toggleSilent}
          />
        </View>

        {prefs.silentHours.enabled && (
          <View
            style={[
              styles.hoursCard,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing.lg,
                marginBottom: spacing.xl,
              },
            ]}
          >
            {(['startHour', 'endHour'] as const).map((which) => (
              <View key={which} style={styles.hourRow}>
                <Text style={[text.body.md, { color: colors.textSecondary }]}>
                  {which === 'startHour' ? 'From' : 'Until'}
                </Text>
                <Pressable
                  onPress={() => stepHour(which)}
                  style={[
                    styles.hourChip,
                    {
                      backgroundColor: colors.bgTertiary,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Change ${which === 'startHour' ? 'start' : 'end'} hour, currently ${formatHour(prefs.silentHours[which])}`}
                >
                  <Text style={[text.body.lg, { color: colors.textPrimary }]}>
                    {formatHour(prefs.silentHours[which])} ›
                  </Text>
                </Pressable>
              </View>
            ))}
            <Text style={[text.label.sm, { color: colors.textMuted, marginTop: spacing.sm }]}>
              Tap a time to advance it by one hour.
            </Text>
          </View>
        )}

        <View style={styles.sosNote}>
          <Warning size={14} color={colors.textMuted} />
          <Text style={[text.body.sm, { color: colors.textMuted, flex: 1 }]}>
            SOS alerts always come through — they ignore every setting above.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  sosNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  hoursCard: { borderWidth: 1 },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  hourChip: { borderWidth: 1 },
})
