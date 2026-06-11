// src/screens/hangouts/components/ProposeSheet.tsx
// Bottom-sheet modal for creating (and editing) a hangout.
// Designed for speed: title + date are required, everything else is optional.

import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../../theme'
import type { Hangout, HangoutCreate } from '../../../lib/schemas/hangout.schema'
import { defaultQuorum } from '../../../lib/utils/hangout'

/** Returns today's date as YYYY-MM-DD string. */
function todayISODate(): string {
  return new Date().toISOString().split('T')[0]
}

interface Props {
  visible:     boolean
  onClose:     () => void
  onSubmit:    (data: HangoutCreate) => Promise<void>
  groupId:     string
  proposedBy:  string
  groupSize:   number
  editing?:    Hangout
}

// ── Quick date chips ──────────────────────────────────────────────────

function quickDates(): Array<{ label: string; date: string }> {
  const today = new Date()
  const result = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const iso   = d.toISOString().split('T')[0]
    const label = i === 0 ? 'Today'
      : i === 1 ? 'Tomorrow'
      : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    result.push({ label, date: iso })
  }
  return result
}

export function ProposeSheet({ visible, onClose, onSubmit, groupId, proposedBy, groupSize, editing }: Props) {
  const { colors, text, spacing, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const [title,    setTitle]    = useState('')
  const [date,     setDate]     = useState(todayISODate())
  const [time,     setTime]     = useState('19:00')
  const [place,    setPlace]    = useState('')
  const [note,     setNote]     = useState('')
  const [budget,   setBudget]   = useState('')
  const [quorum,   setQuorum]   = useState(defaultQuorum(groupSize))
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const dates = quickDates()

  useEffect(() => {
    if (editing) {
      setTitle(editing.title)
      setDate(editing.scheduledDate)
      setTime(editing.scheduledTime ?? '19:00')
      setPlace(editing.placeName ?? '')
      setNote(editing.note ?? '')
      setBudget(editing.budgetEstimate ? String(editing.budgetEstimate) : '')
      setQuorum(editing.quorumThreshold)
    } else {
      setTitle('')
      setDate(todayISODate())
      setTime('19:00')
      setPlace('')
      setNote('')
      setBudget('')
      setQuorum(defaultQuorum(groupSize))
    }
    setError(null)
  }, [editing, visible, groupSize])

  const isValidTime = (t: string) => /^\d{1,2}:\d{2}$/.test(t)
  const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d)

  const handleSubmit = async () => {
    const trimTitle = title.trim()
    if (!trimTitle)          { setError('Title is required.'); return }
    if (!isValidDate(date))  { setError('Please select a valid date.'); return }
    if (!isValidTime(time))  { setError('Time must be in HH:MM format (e.g. 19:30).'); return }

    const budgetNum = budget.trim() ? parseFloat(budget) : undefined
    if (budget.trim() && (isNaN(budgetNum!) || budgetNum! < 0)) {
      setError('Budget must be a positive number.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await onSubmit({
        groupId,
        proposedBy,
        title:           trimTitle,
        scheduledDate:   date,
        scheduledTime:   time,
        placeName:       place.trim() || undefined,
        note:            note.trim() || undefined,
        budgetEstimate:  budgetNum,
        quorumThreshold: quorum,
        status:          'proposed',
      })
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kvWrapper}
      >
        <View style={[
          styles.sheet,
          {
            backgroundColor:      colors.bgSecondary,
            paddingBottom:        insets.bottom + spacing.lg,
            borderTopLeftRadius:  radius.xl,
            borderTopRightRadius: radius.xl,
          },
        ]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[text.heading.sm, { color: colors.textPrimary, marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.lg }]}>
              {editing ? 'Edit hangout' : '🎉 Propose hangout'}
            </Text>

            {/* Title */}
            <View style={[styles.field, { paddingHorizontal: spacing.lg }]}>
              <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: 6 }]}>What's the plan? *</Text>
              <TextInput
                value={title}
                onChangeText={(v) => { setTitle(v); setError(null) }}
                placeholder="Friday dinner, chai at Connaught, movie night…"
                placeholderTextColor={colors.textMuted}
                maxLength={100}
                style={[text.body.md, styles.input, {
                  color:            colors.textPrimary,
                  backgroundColor:  colors.bgTertiary,
                  borderRadius:     radius.md,
                  borderWidth:      1,
                  borderColor:      error && !title.trim() ? colors.accentDanger : colors.border,
                  paddingHorizontal: spacing.md,
                  paddingVertical:  12,
                }]}
                autoFocus
                returnKeyType="next"
                accessibilityLabel="Hangout title"
              />
            </View>

            {/* Date quick chips */}
            <View style={[styles.field, { paddingHorizontal: spacing.lg }]}>
              <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: 6 }]}>When? *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {dates.map((d) => {
                  const active = date === d.date
                  return (
                    <Pressable
                      key={d.date}
                      onPress={() => setDate(d.date)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? colors.accentPrimary + '22' : colors.bgTertiary,
                          borderColor:     active ? colors.accentPrimary         : colors.border,
                          borderRadius:    radius.full,
                          borderWidth:     1,
                          paddingHorizontal: 12,
                          paddingVertical:  7,
                          marginRight:     8,
                        },
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                    >
                      <Text style={[text.label.sm, {
                        color:      active ? colors.accentPrimary : colors.textSecondary,
                        fontFamily: 'Outfit-Medium',
                      }]}>
                        {d.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              {/* Time input */}
              <TextInput
                value={time}
                onChangeText={setTime}
                placeholder="19:00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                style={[text.body.md, styles.input, {
                  color:            colors.textPrimary,
                  backgroundColor:  colors.bgTertiary,
                  borderRadius:     radius.md,
                  borderWidth:      1,
                  borderColor:      colors.border,
                  paddingHorizontal: spacing.md,
                  paddingVertical:  12,
                  width:            100,
                }]}
                accessibilityLabel="Time (HH:MM)"
              />
            </View>

            {/* Place (optional) */}
            <View style={[styles.field, { paddingHorizontal: spacing.lg }]}>
              <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: 6 }]}>Place (optional)</Text>
              <TextInput
                value={place}
                onChangeText={setPlace}
                placeholder="Khan Market, Raghu's place, TBD…"
                placeholderTextColor={colors.textMuted}
                maxLength={100}
                style={[text.body.md, styles.input, {
                  color:            colors.textPrimary,
                  backgroundColor:  colors.bgTertiary,
                  borderRadius:     radius.md,
                  borderWidth:      1,
                  borderColor:      colors.border,
                  paddingHorizontal: spacing.md,
                  paddingVertical:  12,
                }]}
              />
            </View>

            {/* Budget + Quorum row */}
            <View style={[styles.row2col, { paddingHorizontal: spacing.lg }]}>
              <View style={{ flex: 1 }}>
                <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: 6 }]}>Budget per head (₹)</Text>
                <TextInput
                  value={budget}
                  onChangeText={setBudget}
                  placeholder="500"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={7}
                  style={[text.body.md, {
                    color:            colors.textPrimary,
                    backgroundColor:  colors.bgTertiary,
                    borderRadius:     radius.md,
                    borderWidth:      1,
                    borderColor:      colors.border,
                    paddingHorizontal: spacing.md,
                    paddingVertical:  12,
                  }]}
                />
              </View>

              <View style={{ width: 120 }}>
                <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: 6 }]}>Need (yes votes)</Text>
                <View style={[styles.quorumRow, {
                  backgroundColor: colors.bgTertiary,
                  borderRadius:    radius.md,
                  borderColor:     colors.border,
                  borderWidth:     1,
                }]}>
                  <Pressable
                    onPress={() => setQuorum((q) => Math.max(1, q - 1))}
                    style={[styles.quorumBtn, { borderRightColor: colors.border, borderRightWidth: 1 }]}
                    accessibilityLabel="Decrease quorum"
                  >
                    <Text style={[text.body.lg, { color: colors.textSecondary }]}>−</Text>
                  </Pressable>
                  <Text style={[text.body.md, { color: colors.textPrimary, minWidth: 24, textAlign: 'center', fontFamily: 'Outfit-SemiBold' }]}>
                    {quorum}
                  </Text>
                  <Pressable
                    onPress={() => setQuorum((q) => Math.min(groupSize, q + 1))}
                    style={[styles.quorumBtn, { borderLeftColor: colors.border, borderLeftWidth: 1 }]}
                    accessibilityLabel="Increase quorum"
                  >
                    <Text style={[text.body.lg, { color: colors.textSecondary }]}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Note */}
            <View style={[styles.field, { paddingHorizontal: spacing.lg }]}>
              <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: 6 }]}>Note (optional)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Any context for the group…"
                placeholderTextColor={colors.textMuted}
                maxLength={300}
                multiline
                numberOfLines={2}
                style={[text.body.md, {
                  color:             colors.textPrimary,
                  backgroundColor:   colors.bgTertiary,
                  borderRadius:      radius.md,
                  borderWidth:       1,
                  borderColor:       colors.border,
                  paddingHorizontal: spacing.md,
                  paddingTop:        12,
                  paddingBottom:     12,
                  textAlignVertical: 'top',
                  minHeight:         72,
                }]}
              />
            </View>

            {error && (
              <Text style={[text.label.md, { color: colors.accentDanger, marginHorizontal: spacing.lg, marginBottom: spacing.sm }]}>
                {error}
              </Text>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={loading || !title.trim()}
              style={[styles.submitBtn, {
                backgroundColor: (loading || !title.trim()) ? colors.bgTertiary : colors.accentPrimary,
                borderRadius:    radius.md,
                marginHorizontal: spacing.lg,
                marginTop:       spacing.sm,
                paddingVertical: 14,
              }]}
              accessibilityLabel={editing ? 'Save changes' : 'Propose hangout'}
              accessibilityRole="button"
            >
              {loading
                ? <ActivityIndicator color={colors.bgPrimary} />
                : <Text style={[text.body.md, {
                    color:      (loading || !title.trim()) ? colors.textMuted : colors.bgPrimary,
                    textAlign:  'center',
                    fontFamily: 'Outfit-SemiBold',
                  }]}>
                    {editing ? 'Save changes' : 'Propose it 🎉'}
                  </Text>
              }
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: 'rgba(8,12,20,0.6)' },
  kvWrapper: { justifyContent: 'flex-end' },
  sheet:     { paddingTop: 8 },
  handle:    { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  field:     { marginBottom: 16 },
  input:     {},
  chip:      {},
  row2col:   { flexDirection: 'row', gap: 12, marginBottom: 16 },
  quorumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  quorumBtn: { paddingHorizontal: 14, height: '100%', alignItems: 'center', justifyContent: 'center' },
  submitBtn: { alignItems: 'center' },
})
