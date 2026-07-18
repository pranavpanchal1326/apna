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
  Dimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { CaretLeft, MagnifyingGlassPlus } from 'phosphor-react-native'
import { useTheme } from '@theme'
import { haptics } from '@lib/haptics'
import { Screen, Button } from '@components'
import { CategoryIcon, CATEGORY_LABELS } from '@components/expense'
import { Avatar } from '@components/ui/Avatar'
import { useExpenses } from '@hooks/useExpenses'
import { useGroupMembers } from '@hooks/useGroupMembers'
import { useGroupStore } from '@stores/group.store'
import { useAuth } from '@hooks/useAuth'
import { formatINR } from '@lib/utils/currency'
import { ReceiptViewer } from './components/ReceiptViewer'
import { ReceiptChip } from './components/ReceiptChip'
import type { HomeStackScreenProps } from '@navigation/types'

type Props = HomeStackScreenProps<'ExpenseDetail'>

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export function ExpenseDetailScreen({ route }: Props) {
  const { groupId, expenseId } = route.params
  const { colors, text, spacing, radius, fonts } = useTheme()
  const navigation = useNavigation()
  const { user } = useAuth()

  const activeGroup = useGroupStore((s) => s.activeGroup)
  const { expenses, removeExpense, receiptUploads } = useExpenses(groupId)
  const { members } = useGroupMembers(activeGroup?.memberIds ?? [])

  const uploadState = receiptUploads.find((u) => u.expenseId === expenseId)
  const isUploading = uploadState?.status === 'uploading'

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
              haptics.destructiveConfirmed()
              navigation.goBack()
            } catch (err) {
              Alert.alert('Error', 'Failed to delete expense.')
            }
          },
        },
      ]
    )
  }

  return (
    <Screen>
      {/* Header */}
      <View style={[styles.navHeader, { paddingHorizontal: spacing.lg, borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <CaretLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[text.heading.sm, { color: colors.textPrimary }]}>Expense Details</Text>
        <Pressable onPress={handleDelete} style={styles.deleteBtn}>
          <Text style={[text.label.lg, { color: colors.negative }]}>Delete</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero Section */}
        <View style={[styles.heroSection, { backgroundColor: colors.bgSecondary, borderBottomColor: colors.hairline }]}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.category[expense.category]?.tint ?? colors.bgTertiary }]}>
            <CategoryIcon category={expense.category} size={18} color={colors.textSecondary} />
            <Text style={[text.label.md, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
              {CATEGORY_LABELS[expense.category] ?? 'Misc'}
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
        <View style={[styles.section, { borderBottomColor: colors.hairline, padding: spacing.lg }]}>
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
            <View style={{ marginLeft: spacing.md, flex: 1 }}>
              <Text style={[text.body.lg, { color: colors.textPrimary }]}>{payerName}</Text>
              <Text style={[text.label.sm, { color: colors.textSecondary }]}>Paid the full amount</Text>
            </View>
          </View>
          {expense.paidBy !== user?.uid && (
            <Button
              label={`Settle with ${payerName.split(' ')[0]}`}
              variant="secondary"
              onPress={() => navigation.navigate('SettleUp' as any, { groupId, withUid: expense.paidBy })}
              style={{ marginTop: spacing.md }}
            />
          )}
        </View>

        {/* Split Breakdown */}
        <View style={[styles.section, { borderBottomColor: colors.hairline, padding: spacing.lg }]}>
          <View style={styles.sectionHeader}>
            <Text style={[text.label.sm, { color: colors.textSecondary }]}>SPLIT BREAKDOWN</Text>
            <Text style={[text.label.sm, { color: colors.textSecondary }]}>
              {expense.splitType.charAt(0).toUpperCase() + expense.splitType.slice(1)} Split
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
          <View style={[styles.section, { borderBottomColor: colors.hairline, padding: spacing.lg }]}>
            <Text style={[text.label.sm, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              NOTES
            </Text>
            <View style={[styles.notesCard, { backgroundColor: colors.bgSecondary, borderColor: colors.hairline, borderRadius: radius.md, padding: spacing.md }]}>
              <Text style={[text.body.md, { color: colors.textPrimary }]}>{expense.notes}</Text>
            </View>
          </View>
        )}

        {/* Receipt Image */}
        {(expense.receiptUrl || isUploading) && (
          <View style={[styles.section, { padding: spacing.lg }]}>
            <Text style={[text.label.sm, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              RECEIPT PHOTO
            </Text>
            <View style={{ gap: spacing.sm }}>
              <ReceiptChip
                expenseId={expenseId}
                receiptUrl={expense.receiptUrl}
                onPress={() => setReceiptModalVisible(true)}
              />
              {expense.receiptUrl && (
                <Pressable onPress={() => setReceiptModalVisible(true)}>
                  <View style={[styles.receiptImageContainer, { borderColor: colors.hairline, borderRadius: radius.lg }]}>
                    <Image source={{ uri: expense.receiptUrl }} style={styles.receiptImage} resizeMode="cover" />
                    <View style={[styles.receiptOverlay, styles.receiptOverlayRow]}>
                      <MagnifyingGlassPlus size={16} color={colors.textPrimary} />
                      <Text style={[text.label.md, { color: colors.textPrimary }]}>Tap to expand</Text>
                    </View>
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Expanded Receipt Modal */}
      {expense.receiptUrl && (
        <ReceiptViewer
          visible={receiptModalVisible}
          onClose={() => setReceiptModalVisible(false)}
          receiptUrl={expense.receiptUrl}
          groupId={groupId}
          expenseId={expenseId}
          createdBy={expense.createdBy}
        />
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
  receiptOverlayRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
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
