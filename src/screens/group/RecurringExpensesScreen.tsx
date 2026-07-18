// src/screens/group/RecurringExpensesScreen.tsx
// Manage recurring expense templates (rent, subscriptions).
// Templates are generated into real expenses by the daily
// generateRecurringExpenses Cloud Function.

import { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, Switch, StyleSheet, Alert } from 'react-native'
import { useRoute, type RouteProp } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { Trash, Repeat } from 'phosphor-react-native'
import { useTheme } from '@theme'
import { Screen, Header } from '@components'
import {
  subscribeToRecurringExpenses,
  setRecurringExpenseActive,
  deleteRecurringExpense,
} from '@lib/firebase/recurringExpenses'
import { describeRecurrence } from '@lib/utils/recurrence'
import type { RecurringExpenseInput } from '@lib/schemas'
import type { HomeStackParamList } from '@navigation/types'

type Route = RouteProp<HomeStackParamList, 'RecurringExpenses'>

export function RecurringExpensesScreen() {
  const { colors, text, spacing, radius } = useTheme()
  const route = useRoute<Route>()
  const { groupId } = route.params

  const [templates, setTemplates] = useState<RecurringExpenseInput[]>([])

  useEffect(() => {
    const unsub = subscribeToRecurringExpenses(groupId, setTemplates)
    return unsub
  }, [groupId])

  const handleToggle = async (template: RecurringExpenseInput) => {
    Haptics.selectionAsync()
    try {
      await setRecurringExpenseActive(groupId, template.id, !template.active)
    } catch {
      Alert.alert('Error', 'Could not update the schedule. Please try again.')
    }
  }

  const handleDelete = (template: RecurringExpenseInput) => {
    Alert.alert(
      'Delete recurring expense?',
      `"${template.description}" will stop repeating. Already-added expenses stay unchanged.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            try {
              await deleteRecurringExpense(groupId, template.id)
            } catch {
              Alert.alert('Error', 'Could not delete the schedule. Please try again.')
            }
          },
        },
      ],
    )
  }

  const renderItem = ({ item }: { item: RecurringExpenseInput }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSecondary,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
          marginBottom: spacing.sm,
          opacity: item.active ? 1 : 0.55,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[text.body.lg, { color: colors.textPrimary, fontWeight: '600' }]}>
          {item.description}
        </Text>
        <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 2 }]}>
          ₹{item.amount.toLocaleString('en-IN')} · {describeRecurrence(item.frequency, item.dayOfMonth)}
        </Text>
        <Text style={[text.label.sm, { color: colors.textMuted, marginTop: 2 }]}>
          {item.active ? `Next: ${item.nextRunDate}` : 'Paused'}
        </Text>
      </View>

      <View style={styles.actions}>
        <Switch
          value={item.active}
          onValueChange={() => handleToggle(item)}
          trackColor={{ true: colors.accentPrimary, false: colors.border }}
          accessibilityLabel={item.active ? 'Pause schedule' : 'Resume schedule'}
        />
        <Pressable
          onPress={() => handleDelete(item)}
          style={{ padding: spacing.sm }}
          accessibilityRole="button"
          accessibilityLabel="Delete recurring expense"
        >
          <Trash size={18} color={colors.negative} />
        </Pressable>
      </View>
    </View>
  )

  return (
    <Screen>
      <Header title="Recurring Expenses" showBack />
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Repeat size={48} color={colors.textSecondary} style={{ alignSelf: 'center' }} />
            <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md }]}>
              No recurring expenses
            </Text>
            <Text style={[text.body.md, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginHorizontal: spacing.xl }]}>
              When adding an expense, set Repeat to Weekly or Monthly — perfect for rent, WiFi, and subscriptions.
            </Text>
          </View>
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  empty: {
    paddingTop: 80,
  },
})
