// src/screens/expense/ExpenseDetailScreen.tsx
// View expense detail screen.
// Shows: amount, description, category badge, date, payer, split shares, notes, receipt photo, and delete actions.

import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  Alert,
  Modal,
  Dimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Screen, Button } from '@components'
import { Avatar } from '@components/ui/Avatar'
import { useExpenses } from '@hooks/useExpenses'
import { useGroupMembers } from '@hooks/useGroupMembers'
import { useGroupStore } from '@stores/group.store'
import { formatINR } from '@lib/utils/currency'
import type { HomeStackScreenProps } from '@navigation/types'

type Props = HomeStackScreenProps<'ExpenseDetail'>

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export function ExpenseDetailScreen({ route }: Props) {
  const { groupId, expenseId } = route.params
  const { colors, text, spacing, radius, fonts } = useTheme()
  const navigation = useNavigation()

  const activeGroup = useGroupStore((s) => s.activeGroup)
  const { expenses, removeExpense } = useExpenses(groupId)
  const { members } = useGroupMembers(activeGroup?.memberIds ?? [])

  const [receiptModalVisible, setReceiptModalVisible] = useState(false)

  // Find expense in cached list
  const expense = expenses.find((e) => e.id === expenseId)

  if (!expense) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={[text.heading.sm, { color: colors.textPrimary }]}>Expense not found</Text>
          <Button label="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }} />
        </View>
      </Screen>
    )
  }

  // Payer details
  const payerUser = members.get(expense.paidBy)
  const payerName = payerUser?.name ?? 'Someone'

  // Delete handler
  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    Alert.alert(
      'Delete Expense?',
      'Are you sure you want to delete this expense? This will automatically recalculate balances for everyone in the group.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeExpense(groupId, expenseId)
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              navigation.goBack()
            } catch (err) {
              Alert.alert('Error', 'Failed to delete expense.')
            }
          },
        },
      ]
    )
  }

  // Emoji helper for categories
  const getCategoryEmoji = (cat: string) => {
    switch (cat) {
      case 'food':       return '🍽️'
      case 'stay':       return '🏨'
      case 'transport':  return '🚗'
      case 'activities': return '🎯'
      case 'shopping':   return '🛍️'
      default:           return '📦'
    }
  }

  // Title case helper
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

  return (
    <Screen>
      {/* Header */}
      <View style={[styles.navHeader, { paddingHorizontal: spacing.lg, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[text.label.lg, { color: colors.accentPrimary }]}>← Back</Text>
        </Pressable>
        <Text style={[text.heading.sm, { color: colors.textPrimary }]}>Expense Details</Text>
        <Pressable onPress={handleDelete} style={styles.deleteBtn}>
          <Text style={[text.label.lg, { color: colors.accentDanger }]}>Delete</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero Section */}
        <View style={[styles.heroSection, { backgroundColor: colors.bgSecondary, borderBottomColor: colors.border }]}>
          <View style={[styles.categoryBadge, { backgroundColor: `${colors.category?.[expense.category] ?? colors.textSecondary}15` }]}>
            <Text style={{ fontSize: 20 }}>{getCategoryEmoji(expense.category)}</Text>
            <Text style={[text.label.md, { color: colors.category?.[expense.category] ?? colors.textSecondary, marginLeft: spacing.xs }]}>
              {capitalize(expense.category)}
            </Text>
          </View>

          <Text style={[styles.amountText, { fontFamily: fonts.mono, color: colors.textPrimary }]}>
            {formatINR(expense.amount)}
          </Text>

          <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.xl }]}>
            {expense.description}
          </Text>

          <Text style={[text.label.md, { color: colors.textMuted, marginTop: spacing.sm }]}>
            Added on {expense.date}
          </Text>
        </View>

        {/* Payer Info */}
        <View style={[styles.section, { borderBottomColor: colors.border, padding: spacing.lg }]}>
          <Text style={[text.label.sm, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            PAID BY
          </Text>
          <View style={styles.payerRow}>
            {payerUser && (
              <Avatar
                name={payerUser.name}
                imageUrl={payerUser.photoUrl}
                color={payerUser.avatarColor}
                size="md"
              />
            )}
            <View style={{ marginLeft: spacing.md }}>
              <Text style={[text.body.lg, { color: colors.textPrimary }]}>{payerName}</Text>
              <Text style={[text.label.sm, { color: colors.textSecondary }]}>Paid the full amount</Text>
            </View>
          </View>
        </View>

        {/* Split Breakdown */}
        <View style={[styles.section, { borderBottomColor: colors.border, padding: spacing.lg }]}>
          <View style={styles.sectionHeader}>
            <Text style={[text.label.sm, { color: colors.textSecondary }]}>SPLIT BREAKDOWN</Text>
            <Text style={[text.label.sm, { color: colors.textSecondary }]}>
              {capitalize(expense.splitType)} Split
            </Text>
          </View>

          <View style={{ marginTop: spacing.sm }}>
            {Object.entries(expense.splits).map(([uid, share]) => {
              const user = members.get(uid)
              if (!user) return null
              const isPayer = uid === expense.paidBy

              return (
                <View key={uid} style={[styles.splitRow, { paddingVertical: spacing.sm }]}>
                  <View style={styles.splitUser}>
                    <Avatar
                      name={user.name}
                      imageUrl={user.photoUrl}
                      color={user.avatarColor}
                      size="sm"
                    />
                    <Text style={[text.body.sm, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
                      {user.name.split(' ')[0]} {isPayer && '• paid'}
                    </Text>
                  </View>
                  <Text style={[text.mono.sm, { color: colors.textPrimary }]}>
                    {formatINR(share)}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Notes */}
        {expense.notes && (
          <View style={[styles.section, { borderBottomColor: colors.border, padding: spacing.lg }]}>
            <Text style={[text.label.sm, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              NOTES
            </Text>
            <View style={[styles.notesCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md }]}>
              <Text style={[text.body.md, { color: colors.textPrimary }]}>{expense.notes}</Text>
            </View>
          </View>
        )}

        {/* Receipt Image */}
        {expense.receiptUrl && (
          <View style={[styles.section, { padding: spacing.lg }]}>
            <Text style={[text.label.sm, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              RECEIPT PHOTO
            </Text>
            <Pressable onPress={() => setReceiptModalVisible(true)}>
              <View style={[styles.receiptImageContainer, { borderColor: colors.border, borderRadius: radius.lg }]}>
                <Image source={{ uri: expense.receiptUrl }} style={styles.receiptImage} resizeMode="cover" />
                <View style={styles.receiptOverlay}>
                  <Text style={[text.label.md, { color: colors.textPrimary }]}>🔍 Tap to expand</Text>
                </View>
              </View>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Expanded Receipt Modal */}
      {expense.receiptUrl && (
        <Modal
          visible={receiptModalVisible}
          transparent={false}
          animationType="fade"
          onRequestClose={() => setReceiptModalVisible(false)}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.bgPrimary }]}>
            {/* Close button */}
            <Pressable
              onPress={() => setReceiptModalVisible(false)}
              style={[styles.closeModalBtn, { backgroundColor: colors.bgTertiary, borderRadius: radius.full }]}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>×</Text>
            </Pressable>

            <Image
              source={{ uri: expense.receiptUrl }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  navHeader: {
    height:            56,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingVertical: 8,
  },
  deleteBtn: {
    paddingVertical: 8,
  },
  errorContainer: {
    flex:            1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        24,
  },
  heroSection: {
    alignItems:        'center',
    justifyContent:    'center',
    paddingVertical:   32,
    borderBottomWidth: 1,
  },
  categoryBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      16,
  },
  amountText: {
    fontSize:   44,
    fontWeight: 'bold',
    marginTop:  16,
  },
  section: {
    borderBottomWidth: 1,
  },
  payerRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  sectionHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  splitRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  splitUser: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  notesCard: {
    borderWidth: 1,
  },
  receiptImageContainer: {
    height:           200,
    borderWidth:      1,
    overflow:         'hidden',
    position:         'relative',
    justifyContent:   'center',
    alignItems:       'center',
  },
  receiptImage: {
    width:  '100%',
    height: '100%',
  },
  receiptOverlay: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 8,
    alignItems:      'center',
  },
  modalContainer: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
    position:       'relative',
  },
  closeModalBtn: {
    position:        'absolute',
    top:             48,
    right:           24,
    width:           40,
    height:          40,
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          10,
  },
  modalImage: {
    width:  SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.5,
  },
})
