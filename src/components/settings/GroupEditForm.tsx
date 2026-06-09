// src/components/settings/GroupEditForm.tsx
// Inline edit form for group name, emoji, destination, dates, currency.
// Admin only — inputs are read-only for non-admins (display mode).
// Auto-saves on blur. Shows saving/saved state per field.

import { useState, useCallback, useRef } from 'react'
import {
  View, Text, TextInput, Pressable, StyleSheet, Alert,
} from 'react-native'
import { useTheme } from '@theme'
import type { GroupInput } from '@lib/schemas'
import type { GroupEditParams } from '@lib/firebase/groupAdmin'

// Common travel emojis for quick pick
const EMOJI_PRESETS = ['✈️', '🏖️', '🏔️', '🌏', '🎒', '🏕️', '🛳️', '🎭', '🍜', '🎿']
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

interface Props {
  group:       GroupInput
  isAdmin:     boolean
  onSave:      (params: GroupEditParams) => Promise<void>
}

export function GroupEditForm({ group, isAdmin, onSave }: Props) {
  const { colors, text, spacing, radius, fonts } = useTheme()

  const [name,        setName]        = useState(group.name)
  const [emoji,       setEmoji]       = useState(group.coverEmoji ?? '✈️')
  const [destination, setDestination] = useState(group.destination ?? '')
  const [startDate,   setStartDate]   = useState(group.startDate ?? '')
  const [endDate,     setEndDate]     = useState(group.endDate ?? '')
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerSave = useCallback(async (params: GroupEditParams) => {
    if (!isAdmin) return

    // Validate date format if specified
    if (params.startDate !== undefined && params.startDate !== '') {
      if (!DATE_REGEX.test(params.startDate)) {
        setStartDate(group.startDate ?? '')
        Alert.alert('Invalid date format', 'Start date must be in YYYY-MM-DD format.')
        return
      }
    }
    if (params.endDate !== undefined && params.endDate !== '') {
      if (!DATE_REGEX.test(params.endDate)) {
        setEndDate(group.endDate ?? '')
        Alert.alert('Invalid date format', 'End date must be in YYYY-MM-DD format.')
        return
      }
    }

    if (saveTimeout.current) clearTimeout(saveTimeout.current)

    setSaving(true)
    setSaved(false)
    try {
      await onSave(params)
      setSaved(true)
      saveTimeout.current = setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }, [isAdmin, onSave, group])

  const inputStyle = {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: isAdmin ? colors.bgTertiary : 'transparent',
    borderColor: isAdmin ? colors.border : 'transparent',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  }

  const labelStyle = [text.label.md, { color: colors.textSecondary, marginBottom: spacing.xs }]

  return (
    <View style={{ marginBottom: spacing.xl }}>
      {/* Status indicator */}
      {(saving || saved) && (
        <Text style={[text.label.sm, { color: saving ? colors.textMuted : colors.positive, textAlign: 'right', marginBottom: spacing.sm }]}>
          {saving ? 'Saving…' : '✓ Saved'}
        </Text>
      )}

      {/* Emoji picker row */}
      <Text style={labelStyle}>Group Emoji</Text>
      <View style={[styles.emojiRow, { marginBottom: spacing.lg }]}>
        {EMOJI_PRESETS.map(e => (
          <Pressable
            key={e}
            onPress={isAdmin ? () => { setEmoji(e); triggerSave({ coverEmoji: e }) } : undefined}
            style={[
              styles.emojiBtn,
              {
                backgroundColor: emoji === e ? colors.accentPrimary + '20' : colors.bgTertiary,
                borderColor:     emoji === e ? colors.accentPrimary       : colors.border,
                borderWidth:     1,
                borderRadius:    radius.md,
                width:           40,
                height:          40,
                alignItems:      'center',
                justifyContent:  'center',
              },
            ]}
            accessibilityRole="radio"
            accessibilityLabel={`Set emoji ${e}`}
            accessibilityState={{ selected: emoji === e }}
          >
            <Text style={{ fontSize: 20 }}>{e}</Text>
          </Pressable>
        ))}
      </View>

      {/* Group name */}
      <Text style={labelStyle}>Group Name</Text>
      <TextInput
        value={name}
        onChangeText={isAdmin ? setName : undefined}
        onBlur={() => name !== group.name && triggerSave({ name })}
        editable={isAdmin}
        maxLength={50}
        returnKeyType="done"
        style={[inputStyle, { marginBottom: spacing.lg }]}
        accessibilityLabel="Group name"
      />

      {/* Destination */}
      <Text style={labelStyle}>Destination</Text>
      <TextInput
        value={destination}
        onChangeText={isAdmin ? setDestination : undefined}
        onBlur={() => destination !== (group.destination ?? '') && triggerSave({ destination })}
        editable={isAdmin}
        maxLength={100}
        placeholder="e.g. Goa, Rajasthan, Bali"
        placeholderTextColor={colors.textMuted}
        returnKeyType="done"
        style={[inputStyle, { marginBottom: spacing.lg }]}
        accessibilityLabel="Group destination"
      />

      {/* Dates row */}
      <Text style={labelStyle}>Trip Dates</Text>
      <View style={[styles.dateRow, { marginBottom: spacing.lg }]}>
        <TextInput
          value={startDate}
          onChangeText={isAdmin ? setStartDate : undefined}
          onBlur={() => startDate !== (group.startDate ?? '') && triggerSave({ startDate })}
          editable={isAdmin}
          placeholder="Start (YYYY-MM-DD)"
          placeholderTextColor={colors.textMuted}
          style={[inputStyle, { flex: 1 }]}
          keyboardType="numeric"
          maxLength={10}
          accessibilityLabel="Trip start date"
        />
        <Text style={[text.label.md, { color: colors.textMuted, marginHorizontal: spacing.sm }]}>
          →
        </Text>
        <TextInput
          value={endDate}
          onChangeText={isAdmin ? setEndDate : undefined}
          onBlur={() => endDate !== (group.endDate ?? '') && triggerSave({ endDate })}
          editable={isAdmin}
          placeholder="End (YYYY-MM-DD)"
          placeholderTextColor={colors.textMuted}
          style={[inputStyle, { flex: 1 }]}
          keyboardType="numeric"
          maxLength={10}
          accessibilityLabel="Trip end date"
        />
      </View>

      {!isAdmin && (
        <Text style={[text.label.sm, { color: colors.textMuted }]}>
          Only group admins can edit these details.
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: {},
  dateRow:  { flexDirection: 'row', alignItems: 'center' },
})
