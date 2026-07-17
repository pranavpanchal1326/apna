// src/screens/expense/AddExpenseScreen.tsx
// Kora & Ink Add Expense — Blueprint §4.4.1. Two-stage fast path:
//   Stage 1 (the 90% case): amount keypad-first, one description field,
//     auto-suggested category, compact payer + split chips, "Save ₹n".
//   Stage 2 (the 10% case): payer / participants / split method / per-person
//     rows with live remainder, date, notes, recurrence, receipt.
// Save is disabled until amount > 0, description non-empty, split valid.
// Signature moment: the "Save ₹1,240" CTA that always says what it will do.

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
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
import * as Haptics from 'expo-haptics'
import {
  CaretDown,
  CaretLeft,
  Camera,
  Image as ImageIcon,
  CalendarBlank,
  NotePencil,
  X,
  Check,
  ArrowsClockwise,
} from 'phosphor-react-native'
import { useTheme } from '@theme'
import { haptics } from '@lib/haptics'
import {
  Button,
  Screen,
  Sheet,
  Row,
  IconTile,
  Stitch,
  MediaPickerSheet,
  NativeCameraSheet,
  UploadProgressChip,
} from '@components'
import { ExpenseKeypad } from './components/ExpenseKeypad'
import {
  CategoryPicker,
  ParticipantSelector,
  SplitMethodPicker,
  SplitSummaryRow,
} from '@components/expense'
import { Avatar } from '@components/ui/Avatar'
import { formatINR } from '@lib/utils/currency'
import {
  calculateSplit,
  validateSplit,
  type SplitMethod,
  type SplitParticipant,
} from '@lib/engine/splitEngine'
import { useExpenseStore } from '@stores/expense.store'
import { suggestExpenseCategory } from '@lib/firebase/ai'
import { suggestNextPayer } from '@lib/engine/splitSuggestions'
import type { Timestamp } from 'firebase/firestore'
import { addRecurringExpense } from '@lib/firebase/recurringExpenses'
import { computeNextRunDate, describeRecurrence } from '@lib/utils/recurrence'
import type { RecurrenceFrequency } from '@lib/schemas'
import { useGroupStore } from '@stores/group.store'
import { useGroupMembers } from '@hooks/useGroupMembers'
import { useAuth } from '@hooks/useAuth'
import { usePhotoUpload } from '@hooks/usePhotoUpload'
import { nanoid } from 'nanoid/non-secure'
import type { HomeStackScreenProps } from '@navigation/types'
import type { ExpenseCategory } from '@lib/schemas'

type Props = HomeStackScreenProps<'AddExpense'>

// Today as YYYY-MM-DD
function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

export function AddExpenseScreen({ route }: Props) {
  const { groupId } = route.params
  const { colors, text, spacing, radius, fonts, layout } = useTheme()
  const navigation = useNavigation()
  const { user }   = useAuth()

  // Two-stage flow (§4.4.1): 'fast' = keypad path, 'details' = full form
  const [stage, setStage] = useState<'fast' | 'details'>('fast')

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
  const [repeat, setRepeat]             = useState<'none' | RecurrenceFrequency>('none')
  const [expenseId]                     = useState(() => nanoid())
  const [receiptUri, setReceiptUri]     = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [receiptOptionsVisible, setReceiptOptionsVisible] = useState(false)
  const [cameraVisible, setCameraVisible] = useState(false)
  const [galleryVisible, setGalleryVisible] = useState(false)

  const { state: uploadState, uploadPhotos, cancelUpload } = usePhotoUpload()

  // Paid by Sheet visibility
  const [payerSheetVisible, setPayerSheetVisible] = useState(false)

  // Participant selection — default all members
  const memberIds = activeGroup?.memberIds ?? []
  const [selected, setSelected] = useState<Set<string>>(new Set(memberIds))

  // For exact / percentage splits — per-person values
  const [splitValues, setSplitValues] = useState<Record<string, number>>({})

  // ── Smart categorization — auto-suggest while category is untouched ──
  const categoryTouchedRef = useRef(false)
  const handleCategorySelect = useCallback((next: ExpenseCategory) => {
    categoryTouchedRef.current = true
    setCategory(next)
  }, [])

  useEffect(() => {
    const trimmed = title.trim()
    if (categoryTouchedRef.current || trimmed.length < 3) return
    const timer = setTimeout(async () => {
      const suggested = await suggestExpenseCategory(trimmed)
      if (suggested && !categoryTouchedRef.current) setCategory(suggested)
    }, 700)
    return () => clearTimeout(timer)
  }, [title])

  // ── Best-split suggestion — "X paid the last N times" (pure, local) ──
  const groupExpenses = useExpenseStore((s) => s.expensesByGroup[groupId] ?? [])
  const payerSuggestion = useMemo(() => {
    const history = groupExpenses.map((e) => ({
      paidBy: e.paidBy,
      amount: e.amount,
      createdAtMillis:
        (e.createdAt as Timestamp | undefined)?.toMillis?.() ??
        Date.parse(e.date) ??
        0,
    }))
    return suggestNextPayer(history, memberIds)
  }, [groupExpenses, memberIds])

  // ── Derived values ─────────────────────────────────────────────
  const amount = parseFloat(amountStr) || 0

  const participants: SplitParticipant[] = useMemo(
    () => [...selected].map((uid) => ({ uid, value: splitValues[uid] ?? 0 })),
    [selected, splitValues]
  )

  const splitValidation = useMemo(
    () => validateSplit({ totalRupees: amount, participants, method: splitMethod }),
    [amount, participants, splitMethod]
  )

  const splitResults = useMemo(() => {
    if (!splitValidation.isValid || amount <= 0) return []
    try {
      return calculateSplit({ totalRupees: amount, paidByUid, participants, method: splitMethod })
    } catch {
      return []
    }
  }, [splitValidation.isValid, amount, paidByUid, participants, splitMethod])

  const canSave =
    amount > 0 && title.trim().length > 0 && splitValidation.isValid && !isAdding

  // ── Handlers ───────────────────────────────────────────────────
  const initializeSplits = useCallback((method: SplitMethod, currentAmount: number) => {
    if (selected.size === 0) return
    if (method === 'exact' && currentAmount > 0) {
      const base = Math.floor((currentAmount / selected.size) * 100) / 100
      const newVals: Record<string, number> = {}
      selected.forEach((uid) => { newVals[uid] = base })
      const diff = Math.round((currentAmount - base * selected.size) * 100) / 100
      if (newVals[paidByUid] !== undefined) {
        newVals[paidByUid] = Math.round((newVals[paidByUid] + diff) * 100) / 100
      }
      setSplitValues(newVals)
    } else if (method === 'percentage') {
      const base = Math.floor((100 / selected.size) * 100) / 100
      const newVals: Record<string, number> = {}
      selected.forEach((uid) => { newVals[uid] = base })
      const diff = Math.round((100 - base * selected.size) * 100) / 100
      if (newVals[paidByUid] !== undefined) {
        newVals[paidByUid] = Math.round((newVals[paidByUid] + diff) * 100) / 100
      }
      setSplitValues(newVals)
    }
  }, [selected, paidByUid])

  const handleAmountChange = useCallback((clean: string) => {
    setAmountStr(clean)
    const num = parseFloat(clean) || 0
    if (splitMethod !== 'equal') initializeSplits(splitMethod, num)
  }, [splitMethod, initializeSplits])

  const handleMethodChange = (method: SplitMethod) => {
    setSplitMethod(method)
    initializeSplits(method, amount)
  }

  const handleParticipantToggle = useCallback((uid: string) => {
    const copy = new Set(selected)
    if (copy.has(uid)) copy.delete(uid)
    else copy.add(uid)
    setSelected(copy)
    setTimeout(() => {
      if (splitMethod !== 'equal') {
        const base = splitMethod === 'percentage' ? 100 : amount
        if (copy.size > 0 && base > 0) {
          const baseShare = Math.floor((base / copy.size) * 100) / 100
          const newVals: Record<string, number> = {}
          copy.forEach((id) => { newVals[id] = baseShare })
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
    if (splitMethod !== 'equal') initializeSplits(splitMethod, amount)
  }, [memberIds, splitMethod, amount, initializeSplits])

  const handleDeselectAll = useCallback(() => {
    const payerOnly = new Set([paidByUid])
    setSelected(payerOnly)
    if (splitMethod !== 'equal') initializeSplits(splitMethod, amount)
  }, [paidByUid, splitMethod, amount, initializeSplits])

  const handleRowValueChange = useCallback((uid: string, val: number) => {
    setSplitValues((prev) => ({ ...prev, [uid]: val }))
  }, [])

  const handlePayerSelect = useCallback((uid: string) => {
    Haptics.selectionAsync()
    setPaidByUid(uid)
    const copy = new Set(selected)
    copy.add(uid)
    setSelected(copy)
    setPayerSheetVisible(false)
  }, [selected])

  // ── Image Snapping / Picking ─────────────────────────────────────
  const handlePhotoSelect = async (uris: string[]) => {
    if (uris.length === 0) return
    const uri = uris[0]
    setReceiptUri(uri)
    await uploadPhotos({ localUris: [uri], context: 'receipt', groupId, referenceId: expenseId })
  }

  // ── Save Operation ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canSave) return
    setError(null)

    const finalSplits: Record<string, number> = {}
    splitResults.forEach((r) => { finalSplits[r.uid] = r.amountRupees })

    try {
      const hasUploaded = uploadState.results.length > 0 && !uploadState.isUploading && !uploadState.error
      const receiptUrl = hasUploaded ? uploadState.results[0].downloadUrl : ''

      await addExpense({
        id: expenseId,
        groupId,
        description: title.trim(),
        amount,
        paidBy: paidByUid,
        splitType: splitMethod,
        splits: finalSplits,
        category,
        date,
        notes: notes.trim() || undefined,
        createdBy: user?.uid ?? '',
        receiptUrl: receiptUrl || undefined,
        uploadPending: !hasUploaded && receiptUri ? true : undefined,
      })

      if (repeat !== 'none') {
        const dayOfMonth = repeat === 'monthly' ? Number(date.split('-')[2]) : undefined
        try {
          await addRecurringExpense(groupId, {
            description: title.trim(),
            amount,
            currency: 'INR',
            category,
            paidBy: paidByUid,
            splitType: splitMethod,
            splits: finalSplits,
            frequency: repeat,
            ...(dayOfMonth ? { dayOfMonth } : {}),
            nextRunDate: computeNextRunDate(date, repeat, dayOfMonth),
            active: true,
            createdBy: user?.uid ?? '',
          })
        } catch (recErr) {
          console.error('[AddExpense] failed to create recurring template:', recErr)
          Alert.alert('Heads up', 'Expense saved, but the repeat schedule could not be created.')
        }
      }

      haptics.expenseAdded()
      navigation.goBack()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't save the expense. Retry."
      setError(msg)
    }
  }

  // ── Derived display ───────────────────────────────────────────────
  const paidByUser = members.get(paidByUid)
  const paidByLabel = paidByUid === user?.uid ? 'You paid' : `${paidByUser?.name ?? 'Someone'} paid`
  const splitLabel =
    splitMethod === 'equal'
      ? `Split equally with ${selected.size}`
      : splitMethod === 'exact'
      ? `Custom split · ${selected.size}`
      : `By percent · ${selected.size}`

  const saveLabel = amount > 0 ? `Save ${formatINR(amount)}` : 'Save'

  // Live remainder for unequal splits (§4.4.1): haldi while off, leaf when balanced
  const remainder = useMemo(() => {
    if (splitMethod === 'equal' || amount <= 0) return null
    if (splitMethod === 'exact') {
      const sum = [...selected].reduce((a, uid) => a + (splitValues[uid] ?? 0), 0)
      const left = Math.round((amount - sum) * 100) / 100
      return { balanced: Math.abs(left) < 0.01, text: `${formatINR(Math.abs(left))} left to assign` }
    }
    const sum = [...selected].reduce((a, uid) => a + (splitValues[uid] ?? 0), 0)
    const left = Math.round((100 - sum) * 10) / 10
    return { balanced: Math.abs(left) < 0.1, text: `${Math.abs(left)}% left to assign` }
  }, [splitMethod, amount, selected, splitValues])

  // ── Amount hero (shared by both stages) ───────────────────────────
  const AmountHero = (
    <View style={styles.amountHero}>
      <Text
        style={[styles.amountDigits, { fontFamily: fonts.mono, color: colors.textPrimary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        <Text style={{ color: colors.textSecondary, fontSize: 30 }}>₹</Text>
        {amountStr === '' ? '0' : amountStr}
      </Text>
    </View>
  )

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header — transparent, back tile + title (§3.12) */}
        <View style={[styles.navHeader, { paddingHorizontal: layout.screenPaddingH }]}>
          <Pressable
            onPress={() => (stage === 'details' ? setStage('fast') : navigation.goBack())}
            style={[styles.headerTile, { backgroundColor: colors.bgTertiary }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={stage === 'details' ? 'Back' : 'Cancel'}
          >
            <CaretLeft size={20} color={colors.textPrimary} />
          </Pressable>
          <Text style={[text.heading.sm, { color: colors.textPrimary }]}>
            {stage === 'details' ? 'Details' : 'New expense'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {stage === 'fast' ? (
          // ── STAGE 1 — the fast path ──────────────────────────────
          <View style={[styles.fastBody, { paddingHorizontal: layout.screenPaddingH }]}>
            {AmountHero}

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What was this for?"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.descInput,
                {
                  backgroundColor: colors.bgTertiary,
                  color: colors.textPrimary,
                  borderRadius: radius.soft,
                  fontFamily: fonts.body,
                },
              ]}
            />

            {/* Category — auto-suggested IconTile row, tap to change */}
            <View style={{ marginTop: spacing.md }}>
              <CategoryPicker selected={category} onSelect={handleCategorySelect} />
            </View>

            {/* Compact payer + split chips that expand to Stage 2 */}
            <View style={[styles.chipRow, { marginTop: spacing.md }]}>
              <Pressable
                onPress={() => setStage('details')}
                style={[styles.chip, { backgroundColor: colors.bgTertiary, borderRadius: radius.soft }]}
                accessibilityRole="button"
                accessibilityLabel={paidByLabel}
              >
                <Text style={[text.label.md, { color: colors.textSecondary }]} numberOfLines={1}>
                  {paidByLabel}
                </Text>
                <CaretDown size={14} color={colors.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => setStage('details')}
                style={[styles.chip, { backgroundColor: colors.bgTertiary, borderRadius: radius.soft }]}
                accessibilityRole="button"
                accessibilityLabel={splitLabel}
              >
                <Text style={[text.label.md, { color: colors.textSecondary }]} numberOfLines={1}>
                  {splitLabel}
                </Text>
                <CaretDown size={14} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={{ flex: 1 }} />

            <ExpenseKeypad value={amountStr} onChange={handleAmountChange} />

            <Button
              label={saveLabel}
              onPress={handleSave}
              disabled={!canSave}
              variant="primary"
              fullWidth
              style={{ marginTop: spacing.sm, marginBottom: spacing.md }}
            />
          </View>
        ) : (
          // ── STAGE 2 — the details ────────────────────────────────
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: layout.screenPaddingH, paddingBottom: 120 }}
          >
            {AmountHero}

            {/* Paid by */}
            <Row
              title={paidByLabel}
              onPress={() => setPayerSheetVisible(true)}
              leading={
                paidByUser ? (
                  <Avatar name={paidByUser.name} imageUrl={paidByUser.photoUrl} color={paidByUser.avatarColor} size="sm" />
                ) : undefined
              }
              trailing={<CaretDown size={18} color={colors.textMuted} />}
            />

            {/* Best-split hint — plain text, tap to apply */}
            {payerSuggestion && payerSuggestion.suggestedPayerUid !== paidByUid && (
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setPaidByUid(payerSuggestion.suggestedPayerUid) }}
                style={{ marginBottom: spacing.sm }}
                accessibilityRole="button"
                accessibilityLabel="Apply suggested payer"
              >
                <Text style={[text.body.sm, { color: colors.textSecondary }]}>
                  {members.get(payerSuggestion.suggestedPayerUid)?.name ?? 'Someone else'}
                  {"'"}s turn?
                  {payerSuggestion.reason === 'streak' && payerSuggestion.streakPayerUid
                    ? ` ${members.get(payerSuggestion.streakPayerUid)?.name ?? 'One person'} paid the last ${payerSuggestion.streakCount} times.`
                    : payerSuggestion.reason === 'never_paid'
                      ? " They haven't paid yet this trip."
                      : ' They have paid the least so far.'}
                </Text>
              </Pressable>
            )}

            {/* Participants */}
            <View style={{ marginTop: spacing.lg }}>
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

            {/* Split method + live preview */}
            <View style={{ marginTop: spacing.lg }}>
              <SplitMethodPicker selected={splitMethod} onSelect={handleMethodChange} />

              {/* Live remainder line — haldi while off, leaf stitch when balanced */}
              {remainder && (
                <View style={{ marginTop: spacing.sm }}>
                  {remainder.balanced ? (
                    <Stitch color={colors.positive} />
                  ) : (
                    <Text style={[text.body.sm, { color: colors.warning }]}>{remainder.text}</Text>
                  )}
                </View>
              )}

              <View style={{ marginTop: spacing.sm }}>
                {[...selected].map((uid) => {
                  const m = members.get(uid)
                  if (!m) return null
                  const matched = splitResults.find((r) => r.uid === uid)
                  return (
                    <SplitSummaryRow
                      key={uid}
                      user={m}
                      method={splitMethod}
                      amount={matched?.amountRupees ?? 0}
                      value={splitValues[uid]}
                      isPayer={uid === paidByUid}
                      onChangeValue={handleRowValueChange}
                    />
                  )
                })}
              </View>
            </View>

            {/* Date & notes */}
            <View style={{ marginTop: spacing.lg }}>
              <View style={[styles.detailRow, { backgroundColor: colors.bgTertiary, borderRadius: radius.soft }]}>
                <CalendarBlank size={20} color={colors.textSecondary} />
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  style={{ flex: 1, color: colors.textPrimary, fontSize: 15, marginLeft: spacing.sm, fontFamily: fonts.mono }}
                />
              </View>
              <View style={[styles.detailRow, { backgroundColor: colors.bgTertiary, borderRadius: radius.soft, marginTop: spacing.sm }]}>
                <NotePencil size={20} color={colors.textSecondary} />
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Notes (optional)"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={{ flex: 1, color: colors.textPrimary, fontSize: 15, marginLeft: spacing.sm, minHeight: 40, fontFamily: fonts.body }}
                />
              </View>
            </View>

            {/* Repeat */}
            <View style={{ marginTop: spacing.lg }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {([
                  { key: 'none', label: 'One-off' },
                  { key: 'weekly', label: 'Weekly' },
                  { key: 'monthly', label: 'Monthly' },
                ] as const).map((opt) => {
                  const isActive = repeat === opt.key
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => { Haptics.selectionAsync(); setRepeat(opt.key) }}
                      style={[
                        styles.repeatChip,
                        {
                          backgroundColor: colors.bgTertiary,
                          borderRadius: radius.full,
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      accessibilityLabel={`Repeat ${opt.label}`}
                    >
                      <Text style={[text.label.md, { color: isActive ? colors.textPrimary : colors.textMuted }]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
              {repeat !== 'none' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, gap: spacing.xs }}>
                  <ArrowsClockwise size={14} color={colors.textSecondary} />
                  <Text style={[text.body.sm, { color: colors.textSecondary }]}>
                    {describeRecurrence(repeat, repeat === 'monthly' ? Number(date.split('-')[2]) : undefined)} — auto-added
                  </Text>
                </View>
              )}
            </View>

            {/* Receipt */}
            <View style={{ marginTop: spacing.lg }}>
              {receiptUri ? (
                <View style={styles.receiptRow}>
                  <Pressable
                    onPress={() => setReceiptOptionsVisible(true)}
                    style={[styles.stagedReceiptChip, { backgroundColor: colors.bgTertiary, borderRadius: radius.soft }]}
                  >
                    <Image source={{ uri: receiptUri }} style={[styles.miniThumbnail, { borderRadius: radius.soft }]} resizeMode="cover" />
                    <Text style={[text.body.sm, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
                      Receipt attached
                    </Text>
                  </Pressable>
                  <UploadProgressChip
                    state={uploadState.isUploading ? 'uploading' : uploadState.error ? 'error' : uploadState.results.length > 0 ? 'done' : 'idle'}
                    progress={uploadState.progress}
                    onRetry={() => {
                      if (receiptUri) uploadPhotos({ localUris: [receiptUri], context: 'receipt', groupId, referenceId: expenseId })
                    }}
                  />
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); cancelUpload(); setReceiptUri(null) }}
                    style={[styles.miniRemoveBtn, { backgroundColor: colors.bgTertiary, borderRadius: radius.full }]}
                    accessibilityRole="button"
                    accessibilityLabel="Remove receipt"
                  >
                    <X size={12} color={colors.textPrimary} />
                  </Pressable>
                </View>
              ) : (
                <Row
                  title="Add receipt"
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setReceiptOptionsVisible(true) }}
                  leading={<IconTile><Camera size={20} color={colors.textSecondary} /></IconTile>}
                />
              )}
            </View>

            {error && (
              <Text style={[text.body.sm, { color: colors.warning, marginTop: spacing.lg, textAlign: 'center' }]}>
                {error}
              </Text>
            )}

            <Button
              label={saveLabel}
              onPress={handleSave}
              disabled={!canSave}
              variant="primary"
              fullWidth
              style={{ marginTop: spacing.xl }}
            />
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* Paid-by Sheet */}
      <Sheet visible={payerSheetVisible} onClose={() => setPayerSheetVisible(false)} title="Who paid?">
        <ScrollView style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] }}>
          {memberIds.map((uid) => {
            const m = members.get(uid)
            if (!m) return null
            const isSelected = uid === paidByUid
            return (
              <Row
                key={uid}
                title={m.name}
                onPress={() => handlePayerSelect(uid)}
                leading={<Avatar name={m.name} imageUrl={m.photoUrl} color={m.avatarColor} size="sm" />}
                trailing={isSelected ? <Check size={18} color={colors.accentPrimary} /> : undefined}
              />
            )
          })}
        </ScrollView>
      </Sheet>

      {/* Receipt-source Sheet */}
      <Sheet visible={receiptOptionsVisible} onClose={() => setReceiptOptionsVisible(false)} title="Add receipt">
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] }}>
          <Row
            title="Take photo"
            onPress={() => { setReceiptOptionsVisible(false); setCameraVisible(true) }}
            leading={<IconTile><Camera size={20} color={colors.textPrimary} /></IconTile>}
          />
          <Row
            title="Choose from gallery"
            onPress={() => { setReceiptOptionsVisible(false); setGalleryVisible(true) }}
            leading={<IconTile><ImageIcon size={20} color={colors.textPrimary} /></IconTile>}
          />
        </View>
      </Sheet>

      <NativeCameraSheet
        visible={cameraVisible}
        maxPhotos={1}
        onCapture={handlePhotoSelect}
        onClose={() => setCameraVisible(false)}
      />
      <MediaPickerSheet
        visible={galleryVisible}
        maxPhotos={1}
        onSelect={handlePhotoSelect}
        onClose={() => setGalleryVisible(false)}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  navHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fastBody: {
    flex: 1,
  },
  amountHero: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  amountDigits: {
    fontSize: 44,
    letterSpacing: -1,
  },
  descInput: {
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  repeatChip: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stagedReceiptChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  miniThumbnail: {
    width: 28,
    height: 28,
  },
  miniRemoveBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
