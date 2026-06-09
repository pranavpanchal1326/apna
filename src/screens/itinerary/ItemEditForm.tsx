// src/screens/itinerary/ItemEditForm.tsx
// Inline edit form — replaces ItemDetailBody when edit mode is active.
// Editable fields: title, category, notes, timeSlot.startTime/endTime,
//                  estimatedCost, isConfirmed toggle.
// NON-editable: placeRef (location), addedByUid, sortOrder, linkedExpenseIds.
//
// Save: calls onSave(updates) → store.updateItem() → closes edit mode.
// Cancel: discard changes, return to view mode.
// Validation: title required, timeSlot format HH:MM.

import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useTheme }      from '../../theme'
import { Button }        from '../../components'
import { CATEGORY_META } from '../../lib/schemas'
import type { ItineraryItem, ItineraryCategory } from '../../lib/schemas'

interface ItemEditFormProps {
  item:     ItineraryItem
  onSave:   (updates: Partial<ItineraryItem>) => Promise<void>
  onCancel: () => void
}

const EDITABLE_CATEGORIES: ItineraryCategory[] = [
  'attraction', 'food', 'stay', 'transport', 'activity', 'shopping', 'note', 'custom',
]

function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(t)
}

export function ItemEditForm({ item, onSave, onCancel }: ItemEditFormProps) {
  const { colors, text, spacing, radius } = useTheme()

  const [title,     setTitle]     = useState(item.title)
  const [category,  setCategory]  = useState<ItineraryCategory>(item.category)
  const [notes,     setNotes]     = useState(item.notes ?? '')
  const [startTime, setStartTime] = useState(item.timeSlot?.startTime ?? '')
  const [endTime,   setEndTime]   = useState(item.timeSlot?.endTime   ?? '')
  const [cost,      setCost]      = useState(item.estimatedCost ? String(item.estimatedCost) : '')
  const [saving,    setSaving]    = useState(false)
  const [errors,    setErrors]    = useState<Record<string, string>>({})

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!title.trim())                        e.title     = 'Title is required.'
    if (startTime && !isValidTime(startTime)) e.startTime = 'Use HH:MM format (e.g. 09:30).'
    if (endTime   && !isValidTime(endTime))   e.endTime   = 'Use HH:MM format (e.g. 11:00).'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate() || saving) return
    setSaving(true)
    try {
      const updates: Partial<ItineraryItem> = {
        title:    title.trim(),
        category,
        notes:    notes.trim() || undefined,
        estimatedCost: cost ? parseInt(cost.replace(/\D/g, ''), 10) : undefined,
        timeSlot: startTime
          ? { startTime, endTime: endTime || undefined }
          : undefined,
      }
      await onSave(updates)
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View>
          <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            Stop name *
          </Text>
          <TextInput
            value={title}
            onChangeText={t => { setTitle(t); setErrors(e => ({ ...e, title: '' })) }}
            style={[
              text.body.md,
              {
                backgroundColor: colors.bgTertiary,
                color:           colors.textPrimary,
                borderRadius:    radius.md,
                borderWidth:     1,
                borderColor:     errors.title ? colors.accentDanger : colors.border,
                padding:         spacing.md,
                minHeight:       48,
              },
            ]}
            maxLength={100}
            accessibilityLabel="Stop name"
          />
          {errors.title ? (
            <Text style={[text.label.sm, { color: colors.accentDanger, marginTop: spacing.xs }]}>
              {errors.title}
            </Text>
          ) : null}
        </View>

        {/* Category */}
        <View>
          <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
            Category
          </Text>
          <View style={styles.categoryRow}>
            {EDITABLE_CATEGORIES.map(cat => {
              const meta     = CATEGORY_META[cat]
              const isActive = category === cat
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: isActive ? `${colors.accentPrimary}18` : colors.bgTertiary,
                      borderColor:     isActive ? colors.accentPrimary : colors.border,
                      borderRadius:    radius.sm,
                      padding:         spacing.sm,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isActive }}
                >
                  <Text>{meta.emoji}</Text>
                  <Text style={[text.label.sm, { color: isActive ? colors.accentPrimary : colors.textSecondary }]}>
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Time slot */}
        <View>
          <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            Time
          </Text>
          <View style={styles.timeRow}>
            <TextInput
              value={startTime}
              onChangeText={t => { setStartTime(t); setErrors(e => ({ ...e, startTime: '' })) }}
              placeholder="09:30"
              placeholderTextColor={colors.textMuted}
              style={[
                text.mono.md,
                {
                  flex:            1,
                  backgroundColor: colors.bgTertiary,
                  color:           colors.textPrimary,
                  borderRadius:    radius.md,
                  borderWidth:     1,
                  borderColor:     errors.startTime ? colors.accentDanger : colors.border,
                  padding:         spacing.md,
                  height:          48,
                },
              ]}
              maxLength={5}
              accessibilityLabel="Start time"
            />
            <Text style={[text.label.md, { color: colors.textMuted }]}>→</Text>
            <TextInput
              value={endTime}
              onChangeText={t => { setEndTime(t); setErrors(e => ({ ...e, endTime: '' })) }}
              placeholder="11:00"
              placeholderTextColor={colors.textMuted}
              style={[
                text.mono.md,
                {
                  flex:            1,
                  backgroundColor: colors.bgTertiary,
                  color:           colors.textPrimary,
                  borderRadius:    radius.md,
                  borderWidth:     1,
                  borderColor:     errors.endTime ? colors.accentDanger : colors.border,
                  padding:         spacing.md,
                  height:          48,
                },
              ]}
              maxLength={5}
              accessibilityLabel="End time"
            />
          </View>
          {(errors.startTime || errors.endTime) && (
            <Text style={[text.label.sm, { color: colors.accentDanger, marginTop: spacing.xs }]}>
              {errors.startTime || errors.endTime}
            </Text>
          )}
        </View>

        {/* Estimated cost */}
        <View>
          <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            Est. cost (₹)
          </Text>
          <TextInput
            value={cost}
            onChangeText={setCost}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={[
              text.mono.md,
              {
                backgroundColor: colors.bgTertiary,
                color:           colors.textPrimary,
                borderRadius:    radius.md,
                borderWidth:     1,
                borderColor:     colors.border,
                padding:         spacing.md,
                height:          48,
                width:           160,
              },
            ]}
            maxLength={8}
            accessibilityLabel="Estimated cost in rupees"
          />
        </View>

        {/* Notes */}
        <View>
          <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            Notes
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Entry fee, opening hours, tips..."
            placeholderTextColor={colors.textMuted}
            style={[
              text.body.sm,
              {
                backgroundColor:   colors.bgTertiary,
                color:             colors.textPrimary,
                borderRadius:      radius.md,
                borderWidth:       1,
                borderColor:       colors.border,
                padding:           spacing.md,
                minHeight:         80,
                textAlignVertical: 'top',
              },
            ]}
            maxLength={500}
            accessibilityLabel="Notes"
          />
        </View>

        {/* Actions */}
        <View style={[styles.actionRow, { gap: spacing.sm }]}>
          <Button
            variant="ghost"
            label="Cancel"
            onPress={onCancel}
            style={{ flex: 1 }}
          />
          <Button
            variant="primary"
            label={saving ? 'Saving...' : 'Save'}
            onPress={handleSave}
            disabled={saving}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  categoryRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
  },
  catChip: {
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    1,
    width:          72,
    minHeight:      56,
    gap:            2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop:     8,
  },
})
