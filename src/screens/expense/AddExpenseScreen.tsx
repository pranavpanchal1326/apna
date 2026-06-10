// src/screens/expense/AddExpenseScreen.tsx
// Add expense — single-screen vertical scroll flow.
// Sections (top to bottom):
//   1. Amount input (large, numeric, JetBrains Mono)
//   2. Title input (description)
//   3. Category picker (horizontal scroll)
//   4. Date picker (text — YYYY-MM-DD)
//   5. Paid by selector (triggering custom BottomSheet)
//   6. Participant selector (multi-select grid)
//   7. Split method + live split preview
//   8. Notes (optional, text)
//   9. Receipt photo (optional, snap or pick)
//  10. Save button
//
// Split preview updates live as user changes amount / participants / method.
// Save is disabled until: amount > 0, description non-empty, split is valid.

import {
  useState,
  useCallback,
  useMemo,
} from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Button, Screen } from '@components'
import { BottomSheet } from '@components/ui/BottomSheet'
import {
  CategoryPicker,
  ParticipantSelector,
  SplitMethodPicker,
  SplitSummaryRow,
} from '@components/expense'
import { Avatar } from '@components/ui/Avatar'
import {
  calculateSplit,
  validateSplit,
  type SplitMethod,
  type SplitParticipant,
} from '@lib/engine/splitEngine'
import { useExpenseStore } from '@stores/expense.store'
import { useGroupStore } from '@stores/group.store'
import { useGroupMembers } from '@hooks/useGroupMembers'
import { useAuth } from '@hooks/useAuth'
import { compressReceiptImage } from '@lib/utils/imageCompression'
import { ReceiptCamera } from './components/ReceiptCamera'
import type { HomeStackScreenProps } from '@navigation/types'
import type { ExpenseCategory } from '@lib/schemas'

type Props = HomeStackScreenProps<'AddExpense'>

// Today as YYYY-MM-DD
function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

export function AddExpenseScreen({ route }: Props) {
  const { groupId } = route.params
  const { colors, text, spacing, radius, fonts } = useTheme()
  const navigation = useNavigation()
  const { user }   = useAuth()

  const activeGroup = useGroupStore((s) => s.activeGroup)
  const { addExpense, isAdding } = useExpenseStore()
  const { members } = useGroupMembers(activeGroup?.memberIds ?? [])

  // ── Form state ─────────────────────────────────────────────────
  const [amountStr, setAmountStr]       = useState('')
  const [title, setTitle]               = useState('')
  const [category, setCategory]         = useState<ExpenseCategory>('misc')
  const [date, setDate]                 = useState(todayString())
  const [paidByUid, setPaidByUid]       = useState(user?.uid ?? '')
  const [splitMethod, setSplitMethod]   = useState<SplitMethod>('equal')
  const [notes, setNotes]               = useState('')
  const [receiptUri, setReceiptUri]     = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [receiptOptionsVisible, setReceiptOptionsVisible] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  
  // Paid by BottomSheet visibility
  const [payerSheetVisible, setPayerSheetVisible] = useState(false)

  // Participant selection — default all members
  const memberIds = activeGroup?.memberIds ?? []
  const [selected, setSelected] = useState<Set<string>>(new Set(memberIds))

  // For exact / percentage splits — per-person values
  const [splitValues, setSplitValues] = useState<Record<string, number>>({})

  // ── Derived values ─────────────────────────────────────────────
  const amount = parseFloat(amountStr) || 0

  const participants: SplitParticipant[] = useMemo(
    () =>
      [...selected].map((uid) => ({
        uid,
        value: splitValues[uid] ?? 0,
      })),
    [selected, splitValues]
  )

  const splitValidation = useMemo(
    () => validateSplit({ totalRupees: amount, participants, method: splitMethod }),
    [amount, participants, splitMethod]
  )

  const splitResults = useMemo(() => {
    if (!splitValidation.isValid || amount <= 0) return []
    try {
      return calculateSplit({
        totalRupees:  amount,
        paidByUid,
        participants,
        method:       splitMethod,
      })
    } catch {
      return []
    }
  }, [splitValidation.isValid, amount, paidByUid, participants, splitMethod])

  const canSave =
    amount > 0 &&
    title.trim().length > 0 &&
    splitValidation.isValid &&
    !isAdding

  // ── Handlers ───────────────────────────────────────────────────

  // Pre-fill splits equally when changing split method or amount
  const initializeSplits = useCallback((method: SplitMethod, currentAmount: number) => {
    if (selected.size === 0) return

    if (method === 'exact' && currentAmount > 0) {
      const base = Math.floor((currentAmount / selected.size) * 100) / 100
      const newVals: Record<string, number> = {}
      selected.forEach((uid) => {
        newVals[uid] = base
      })
      const diff = Math.round((currentAmount - base * selected.size) * 100) / 100
      if (newVals[paidByUid] !== undefined) {
        newVals[paidByUid] = Math.round((newVals[paidByUid] + diff) * 100) / 100
      }
      setSplitValues(newVals)
    } else if (method === 'percentage') {
      const base = Math.floor((100 / selected.size) * 100) / 100
      const newVals: Record<string, number> = {}
      selected.forEach((uid) => {
        newVals[uid] = base
      })
      const diff = Math.round((100 - base * selected.size) * 100) / 100
      if (newVals[paidByUid] !== undefined) {
        newVals[paidByUid] = Math.round((newVals[paidByUid] + diff) * 100) / 100
      }
      setSplitValues(newVals)
    }
  }, [selected, paidByUid])

  const handleAmountChange = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, '')
    setAmountStr(clean)
    const num = parseFloat(clean) || 0
    if (splitMethod !== 'equal') {
      initializeSplits(splitMethod, num)
    }
  }

  const handleMethodChange = (method: SplitMethod) => {
    setSplitMethod(method)
    initializeSplits(method, amount)
  }

  const handleParticipantToggle = useCallback((uid: string) => {
    const copy = new Set(selected)
    if (copy.has(uid)) {
      copy.delete(uid)
    } else {
      copy.add(uid)
    }
    setSelected(copy)
    
    // Trigger splits re-init on participant toggle if not equal split
    setTimeout(() => {
      if (splitMethod !== 'equal') {
        const base = splitMethod === 'percentage' ? 100 : amount
        if (copy.size > 0 && base > 0) {
          const baseShare = Math.floor((base / copy.size) * 100) / 100
          const newVals: Record<string, number> = {}
          copy.forEach((id) => {
            newVals[id] = baseShare
          })
          const diff = Math.round((base - baseShare * copy.size) * 100) / 100
          if (newVals[paidByUid] !== undefined) {
            newVals[paidByUid] = Math.round((newVals[paidByUid] + diff) * 100) / 100
          }
          setSplitValues(newVals)
        }
      }
    }, 0)
  }, [selected, splitMethod, amount, paidByUid])

  const handleSelectAll = useCallback(() => {
    const all = new Set(memberIds)
    setSelected(all)
    if (splitMethod !== 'equal') {
      initializeSplits(splitMethod, amount)
    }
  }, [memberIds, splitMethod, amount, initializeSplits])

  const handleDeselectAll = useCallback(() => {
    // Keep only the payer
    const payerOnly = new Set([paidByUid])
    setSelected(payerOnly)
    if (splitMethod !== 'equal') {
      initializeSplits(splitMethod, amount)
    }
  }, [paidByUid, splitMethod, amount, initializeSplits])

  const handleRowValueChange = useCallback((uid: string, val: number) => {
    setSplitValues((prev) => ({ ...prev, [uid]: val }))
  }, [])

  // Paid By selection
  const handlePayerSelect = useCallback((uid: string) => {
    Haptics.selectionAsync()
    setPaidByUid(uid)
    
    // The payer MUST be in the split participants
    const copy = new Set(selected)
    copy.add(uid)
    setSelected(copy)
    
    setPayerSheetVisible(false)
  }, [selected])

  // ── Image Snapping / Picking ─────────────────────────────────────
  const processImageUri = async (uri: string) => {
    try {
      const compressed = await compressReceiptImage(uri)
      setReceiptUri(compressed.uri)
    } catch (err) {
      console.error('[AddExpenseScreen] Image compression failed:', err)
      Alert.alert('Error', 'Failed to compress receipt photo.')
    }
  }

  const pickGalleryImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'We need library permissions to select receipts.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      })

      if (result.canceled || !result.assets?.[0]?.uri) return

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      await processImageUri(result.assets[0].uri)
    } catch (err) {
      console.error('Error selecting gallery image:', err)
      Alert.alert('Error', 'Failed to pick image.')
    }
  }

  const handleCameraCapture = async (uri: string) => {
    setCameraActive(false)
    await processImageUri(uri)
  }

  // ── Save Operation ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canSave) return
    setError(null)

    // Construct final splits mapping for database matching our Schema { uid: shareAmount }
    const finalSplits: Record<string, number> = {}
    if (splitMethod === 'equal') {
      splitResults.forEach((r) => {
        finalSplits[r.uid] = r.amountRupees
      })
    } else {
      // For exact/percentage, construct from calculated results to preserve payer leftovers
      splitResults.forEach((r) => {
        finalSplits[r.uid] = r.amountRupees
      })
    }

    try {
      await addExpense({
        groupId,
        description:  title.trim(),
        amount,
        paidBy:       paidByUid,
        splitType:    splitMethod,
        splits:       finalSplits,
        category,
        date,
        notes:        notes.trim() || undefined,
        createdBy:    user?.uid ?? '',
      }, receiptUri ?? undefined)

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      navigation.goBack()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save expense.'
      setError(msg)
      Alert.alert('Error', msg)
    }
  }

  // ── Paid By Display Name ──────────────────────────────────────────
  const paidByUser = members.get(paidByUid)
  const paidByLabel = paidByUid === user?.uid ? 'You' : paidByUser?.name ?? 'Select Member'

  if (cameraActive) {
    return (
      <ReceiptCamera
        onCapture={handleCameraCapture}
        onClose={() => setCameraActive(false)}
      />
    )
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.navHeader, { paddingHorizontal: spacing.lg, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={[text.label.lg, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Text style={[text.heading.sm, { color: colors.textPrimary }]}>Add Expense</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
        >
          {/* Amount input */}
          <View style={[styles.amountCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border, borderRadius: radius.xl, padding: spacing.xl, marginTop: spacing.md }]}>
            <Text style={[text.label.sm, { color: colors.textSecondary, textAlign: 'center' }]}>
              ENTER AMOUNT
            </Text>
            <View style={styles.amountInputRow}>
              <Text style={[styles.currencySymbol, { fontFamily: fonts.mono, color: colors.accentPrimary }]}>
                ₹
              </Text>
              <TextInput
                value={amountStr}
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                autoFocus
                style={[
                  styles.amountInputText,
                  {
                    fontFamily: fonts.mono,
                    color: colors.textPrimary,
                  },
                ]}
              />
            </View>
          </View>

          {/* Description / Title */}
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[text.label.sm, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              WHAT WAS THIS FOR?
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Dinner, Cab, Airbnb booking"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.bgSecondary,
                  borderColor:     colors.border,
                  color:           colors.textPrimary,
                  borderRadius:    radius.lg,
                  padding:         spacing.md,
                  fontSize:        16,
                },
              ]}
            />
          </View>

          {/* Category Picker */}
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[text.label.sm, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              CATEGORY
            </Text>
            <CategoryPicker selected={category} onSelect={setCategory} />
          </View>

          {/* Paid By Selector */}
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[text.label.sm, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              PAID BY
            </Text>
            <Pressable
              onPress={() => setPayerSheetVisible(true)}
              style={[
                styles.selectorPressable,
                {
                  backgroundColor: colors.bgSecondary,
                  borderColor:     colors.border,
                  borderRadius:    radius.lg,
                  padding:         spacing.md,
                },
              ]}
            >
              <View style={styles.selectorLeft}>
                {paidByUser && (
                  <Avatar
                    name={paidByUser.name}
                    imageUrl={paidByUser.photoUrl}
                    color={paidByUser.avatarColor}
                    size="sm"
                  />
                )}
                <Text style={[text.body.lg, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
                  {paidByLabel}
                </Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>▾</Text>
            </Pressable>
          </View>

          {/* Participants selector */}
          <View style={{ marginTop: spacing.xl }}>
            <ParticipantSelector
              members={members}
              memberIds={memberIds}
              selected={selected}
              paidByUid={paidByUid}
              onToggle={handleParticipantToggle}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
            />
          </View>

          {/* Split Method Picker & Live Preview */}
          <View style={{ marginTop: spacing.xl }}>
            <Text style={[text.label.sm, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              SPLIT METHOD
            </Text>
            <SplitMethodPicker selected={splitMethod} onSelect={handleMethodChange} />

            {/* Split status helper or validation errors */}
            {splitValidation.error ? (
              <Text style={[text.label.md, { color: colors.accentDanger, marginTop: spacing.sm }]}>
                ⚠️ {splitValidation.error}
              </Text>
            ) : null}

            {/* Live split preview grid */}
            <View style={[styles.previewBox, { borderTopColor: colors.border, marginTop: spacing.sm }]}>
              {[...selected].map((uid) => {
                const user = members.get(uid)
                if (!user) return null

                // For display in Equal split, calculate share
                const matchedResult = splitResults.find((r) => r.uid === uid)
                const shareAmount = matchedResult?.amountRupees ?? 0

                return (
                  <SplitSummaryRow
                    key={uid}
                    user={user}
                    method={splitMethod}
                    amount={shareAmount}
                    value={splitValues[uid]}
                    isPayer={uid === paidByUid}
                    onChangeValue={handleRowValueChange}
                  />
                )
              })}
            </View>
          </View>

          {/* Optional Details: Date & Notes */}
          <View style={{ marginTop: spacing.xl }}>
            <Text style={[text.label.sm, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              DETAILS
            </Text>

            <View style={[styles.detailInputRow, { backgroundColor: colors.bgSecondary, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.sm }]}>
              <Text style={{ fontSize: 16, marginRight: spacing.sm }}>📅</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                style={{ flex: 1, color: colors.textPrimary, fontSize: 15 }}
              />
            </View>

            <View style={[styles.detailInputRow, { backgroundColor: colors.bgSecondary, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.sm, marginTop: spacing.sm }]}>
              <Text style={{ fontSize: 16, marginRight: spacing.sm }}>📝</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes (optional)"
                placeholderTextColor={colors.textMuted}
                multiline
                style={{ flex: 1, color: colors.textPrimary, fontSize: 15, minHeight: 40 }}
              />
            </View>
          </View>

          {/* Receipt attachment control */}
          <View style={{ marginTop: spacing.xl }}>
            <Text style={[text.label.sm, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              RECEIPT
            </Text>
            {receiptUri ? (
              <View style={styles.receiptChipContainer}>
                <Pressable
                  onPress={() => setReceiptOptionsVisible(true)}
                  style={[
                    styles.stagedReceiptChip,
                    {
                      backgroundColor: colors.bgSecondary,
                      borderColor:     colors.border,
                      borderRadius:    radius.md,
                      padding:         spacing.sm,
                    }
                  ]}
                >
                  <Image source={{ uri: receiptUri }} style={[styles.miniThumbnail, { borderRadius: radius.sm }]} resizeMode="cover" />
                  <Text style={[text.body.sm, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
                    Receipt attached
                  </Text>
                </Pressable>
                
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setReceiptUri(null)
                  }}
                  style={[styles.miniRemoveBtn, { backgroundColor: colors.accentDanger, borderRadius: radius.full }]}
                >
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>×</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setReceiptOptionsVisible(true)
                }}
                style={({ pressed }) => [
                  styles.addReceiptRow,
                  {
                    backgroundColor: colors.bgSecondary,
                    borderColor:     colors.border,
                    borderRadius:    radius.lg,
                    padding:         spacing.md,
                    opacity:         pressed ? 0.8 : 1,
                  }
                ]}
              >
                <Text style={[text.body.lg, { color: colors.textSecondary }]}>📷 Add receipt</Text>
              </Pressable>
            )}
          </View>

          {/* Error display */}
          {error && (
            <Text style={[text.label.md, { color: colors.accentDanger, marginTop: spacing.lg, textAlign: 'center' }]}>
              {error}
            </Text>
          )}

          {/* Save Button */}
          <View style={{ marginTop: spacing.xl }}>
            <Button
              label={isAdding ? 'Saving...' : 'Save Expense'}
              onPress={handleSave}
              disabled={!canSave}
              variant="primary"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Paid By Selection BottomSheet */}
      <BottomSheet
        visible={payerSheetVisible}
        onClose={() => setPayerSheetVisible(false)}
        title="Who paid?"
      >
        <ScrollView style={{ padding: spacing.md }}>
          {memberIds.map((uid) => {
            const user = members.get(uid)
            if (!user) return null
            const isSelected = uid === paidByUid

            return (
              <Pressable
                key={uid}
                onPress={() => handlePayerSelect(uid)}
                style={[
                  styles.payerSheetRow,
                  {
                    borderBottomColor: colors.border,
                    paddingVertical:   spacing.md,
                    backgroundColor:   isSelected ? `${colors.accentPrimary}10` : 'transparent',
                  },
                ]}
              >
                <Avatar
                  name={user.name}
                  imageUrl={user.photoUrl}
                  color={user.avatarColor}
                  size="sm"
                />
                <Text style={[text.body.lg, { color: colors.textPrimary, flex: 1, marginLeft: spacing.md }]}>
                  {user.name}
                </Text>
                {isSelected && (
                  <Text style={{ color: colors.accentPrimary, fontSize: 16 }}>✓</Text>
                )}
              </Pressable>
            )
          })}
        </ScrollView>
      </BottomSheet>

      {/* Receipt Options Selection BottomSheet */}
      <BottomSheet
        visible={receiptOptionsVisible}
        onClose={() => setReceiptOptionsVisible(false)}
        title="Add Receipt"
      >
        <View style={{ padding: spacing.md, gap: spacing.sm }}>
          <Pressable
            onPress={() => {
              setReceiptOptionsVisible(false)
              setCameraActive(true)
            }}
            style={[styles.sheetOptionRow, { borderBottomColor: colors.border }]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Take photo with camera"
          >
            <Text style={{ fontSize: 20, marginRight: spacing.md }}>📸</Text>
            <Text style={[text.body.lg, { color: colors.textPrimary }]}>Take photo</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setReceiptOptionsVisible(false)
              pickGalleryImage()
            }}
            style={styles.sheetOptionRow}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Choose photo from gallery"
          >
            <Text style={{ fontSize: 20, marginRight: spacing.md }}>🖼️</Text>
            <Text style={[text.body.lg, { color: colors.textPrimary }]}>Choose from gallery</Text>
          </Pressable>
        </View>
      </BottomSheet>
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
  amountCard: {
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  amountInputRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      8,
  },
  currencySymbol: {
    fontSize: 48,
    marginRight: 4,
  },
  amountInputText: {
    fontSize:  48,
    minWidth:  120,
    textAlign: 'center',
    padding:   0,
  },
  textInput: {
    borderWidth: 1,
  },
  selectorPressable: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    borderWidth:    1,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  previewBox: {
    borderTopWidth: 1,
    marginTop:      8,
  },
  detailInputRow: {
    flexDirection: 'row',
    alignItems:    'center',
    borderWidth:   1,
  },
  payerSheetRow: {
    flexDirection:     'row',
    alignItems:        'center',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  addReceiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  receiptChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stagedReceiptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingRight: 12,
  },
  miniThumbnail: {
    width: 24,
    height: 24,
  },
  miniRemoveBtn: {
    marginLeft: 8,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
})
