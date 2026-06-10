// src/screens/lists/components/CreateListSheet.tsx
// Bottom-sheet style modal for creating (and editing) a list.
// Keeps creation fast — only title + type are required.

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
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../../theme'
import { LIST_TYPE_META } from './ListTypeIcon'
import type { SharedList, SharedListCreate, SharedListType } from '../../../lib/schemas/list.schema'

interface Props {
  visible:   boolean
  onClose:   () => void
  onSubmit:  (data: SharedListCreate) => Promise<void>
  groupId:   string
  createdBy: string
  editing?:  SharedList  // If provided, we're editing an existing list
}

const LIST_TYPES: SharedListType[] = ['packing', 'grocery', 'task']

export function CreateListSheet({ visible, onClose, onSubmit, groupId, createdBy, editing }: Props) {
  const { colors, text, spacing, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const [title,       setTitle]       = useState('')
  const [type,        setType]        = useState<SharedListType>('packing')
  const [description, setDescription] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  // Pre-fill when editing
  useEffect(() => {
    if (editing) {
      setTitle(editing.title)
      setType(editing.type)
      setDescription(editing.description ?? '')
    } else {
      setTitle('')
      setType('packing')
      setDescription('')
    }
    setError(null)
  }, [editing, visible])

  const handleSubmit = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) { setError('Title is required.'); return }
    setLoading(true)
    setError(null)
    try {
      await onSubmit({
        groupId,
        createdBy,
        type,
        title:       trimmedTitle,
        description: description.trim() || undefined,
        archived:    false,
      })
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kvWrapper}
      >
        <View style={[
          styles.sheet,
          {
            backgroundColor:  colors.bgSecondary,
            paddingBottom:    insets.bottom + spacing.lg,
            borderTopLeftRadius:  radius.xl,
            borderTopRightRadius: radius.xl,
          },
        ]}>
          {/* Handle bar */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[text.heading.sm, { color: colors.textPrimary, marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.lg }]}>
              {editing ? 'Edit list' : 'New list'}
            </Text>

            {/* List type selector */}
            <View style={[styles.typeRow, { paddingHorizontal: spacing.lg, marginBottom: spacing.md }]}>
              {LIST_TYPES.map((t) => {
                const meta    = LIST_TYPE_META[t]
                const active  = type === t
                return (
                  <Pressable
                    key={t}
                    onPress={() => setType(t)}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: active ? colors.accentPrimary + '22' : colors.bgTertiary,
                        borderColor:     active ? colors.accentPrimary         : colors.border,
                        borderRadius:    radius.md,
                        flex:            1,
                      },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={meta.label}
                  >
                    <Text style={{ fontSize: 20 }}>{meta.emoji}</Text>
                    <Text style={[text.label.sm, {
                      color:      active ? colors.accentPrimary : colors.textSecondary,
                      fontFamily: 'Outfit-SemiBold',
                      marginTop:  4,
                    }]}>{meta.label}</Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Title */}
            <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
              <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: 6 }]}>
                Title *
              </Text>
              <TextInput
                value={title}
                onChangeText={(v) => { setTitle(v); setError(null) }}
                placeholder={LIST_TYPE_META[type].hint}
                placeholderTextColor={colors.textMuted}
                maxLength={80}
                returnKeyType="next"
                style={[
                  text.body.md,
                  {
                    color:            colors.textPrimary,
                    backgroundColor:  colors.bgTertiary,
                    borderRadius:     radius.md,
                    borderWidth:      1,
                    borderColor:      error ? colors.accentDanger : colors.border,
                    paddingHorizontal: spacing.md,
                    paddingVertical:  12,
                  },
                ]}
                accessibilityLabel="List title"
              />
            </View>

            {/* Description */}
            <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
              <Text style={[text.label.md, { color: colors.textSecondary, marginBottom: 6 }]}>
                Description (optional)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Add context for the group…"
                placeholderTextColor={colors.textMuted}
                maxLength={300}
                multiline
                numberOfLines={2}
                style={[
                  text.body.md,
                  {
                    color:            colors.textPrimary,
                    backgroundColor:  colors.bgTertiary,
                    borderRadius:     radius.md,
                    borderWidth:      1,
                    borderColor:      colors.border,
                    paddingHorizontal: spacing.md,
                    paddingTop:       12,
                    paddingBottom:    12,
                    textAlignVertical: 'top',
                    minHeight:        80,
                  },
                ]}
                accessibilityLabel="List description"
              />
            </View>

            {error && (
              <Text style={[text.label.md, { color: colors.accentDanger, marginHorizontal: spacing.lg, marginBottom: spacing.md }]}>
                {error}
              </Text>
            )}

            {/* Submit */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading || !title.trim()}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: (loading || !title.trim()) ? colors.bgTertiary : colors.accentPrimary,
                  borderRadius:    radius.md,
                  marginHorizontal: spacing.lg,
                  paddingVertical: 14,
                },
              ]}
              accessibilityLabel={editing ? 'Save changes' : 'Create list'}
              accessibilityRole="button"
            >
              {loading
                ? <ActivityIndicator color={colors.bgPrimary} />
                : <Text style={[text.body.md, { color: (loading || !title.trim()) ? colors.textMuted : colors.bgPrimary, fontFamily: 'Outfit-SemiBold', textAlign: 'center' }]}>
                    {editing ? 'Save changes' : 'Create list'}
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,12,20,0.6)',
  },
  kvWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopWidth: 0,
    paddingTop:     8,
  },
  handle: {
    width:        40,
    height:       4,
    borderRadius: 2,
    alignSelf:    'center',
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    gap:           10,
  },
  typeChip: {
    padding:       12,
    alignItems:    'center',
    borderWidth:   1.5,
  },
  submitBtn: {
    alignItems: 'center',
  },
})
