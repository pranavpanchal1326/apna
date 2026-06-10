// src/screens/lists/components/AddItemBar.tsx
// Sticky bottom bar for fast item entry in a list.
// Pressing Enter / submit adds the item and clears the field.

import { useState, useRef, useCallback } from 'react'
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  type TextInput as TextInputType,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../../theme'

interface Props {
  onAdd:      (text: string) => Promise<void>
  placeholder?: string
  disabled?:  boolean
}

export function AddItemBar({ onAdd, placeholder = 'Add an item…', disabled }: Props) {
  const { colors, text, spacing, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<TextInputType>(null)

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed || loading) return
    setLoading(true)
    try {
      await onAdd(trimmed)
      setValue('')
      // Keep focus so user can add multiple items fast
      inputRef.current?.focus()
    } catch {
      // Error handled in store
    } finally {
      setLoading(false)
    }
  }, [value, loading, onAdd])

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom:    insets.bottom + 8,
          backgroundColor:  colors.bgSecondary,
          borderTopColor:   colors.border,
          paddingHorizontal: spacing.md,
          paddingTop:       spacing.sm,
        },
      ]}
    >
      <View style={[
        styles.inputRow,
        { backgroundColor: colors.bgTertiary, borderRadius: radius.md, borderColor: colors.border, borderWidth: 1 },
      ]}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={setValue}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          blurOnSubmit={false}
          editable={!disabled && !loading}
          style={[
            text.body.md,
            styles.input,
            { color: colors.textPrimary, paddingHorizontal: spacing.md, paddingVertical: 12 },
          ]}
          accessibilityLabel="New list item text"
        />

        <Pressable
          onPress={handleSubmit}
          disabled={!value.trim() || loading || disabled}
          style={[
            styles.addBtn,
            {
              backgroundColor: value.trim() ? colors.accentPrimary : colors.bgTertiary,
              borderRadius:    radius.md - 2,
              margin:          4,
              paddingHorizontal: spacing.md,
            },
          ]}
          accessibilityLabel="Add item"
          accessibilityRole="button"
        >
          {loading
            ? <ActivityIndicator size={14} color={colors.bgPrimary} />
            : <Text style={[text.label.md, { color: value.trim() ? colors.bgPrimary : colors.textMuted, fontFamily: 'Outfit-SemiBold' }]}>
                Add
              </Text>
          }
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  input: {
    flex: 1,
  },
  addBtn: {
    height:         40,
    alignItems:     'center',
    justifyContent: 'center',
    minWidth:       52,
  },
})
