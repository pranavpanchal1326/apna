// src/screens/lists/ListDetailScreen.tsx
// Full list view — items, add bar, completed section collapse, claim interactions.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../theme'
import { useListStore } from '../../stores/list.store'
import { useAuthStore } from '../../stores/auth.store'
import { useGroupStore } from '../../stores/group.store'
import { useGroupMembers } from '../../hooks/useGroupMembers'
import { AddItemBar } from './components/AddItemBar'
import { ListItemRow } from './components/ListItemRow'
import { CreateListSheet } from './components/CreateListSheet'
import { LIST_TYPE_META } from './components/ListTypeIcon'
import type { SharedListItem, SharedListCreate } from '../../lib/schemas/list.schema'
import type { ListsStackParamList } from '../../navigation/types'

type RouteProps = RouteProp<ListsStackParamList, 'ListDetail'>

export function ListDetailScreen() {
  const { colors, text, spacing } = useTheme()
  const insets     = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const route      = useRoute<RouteProps>()
  const { listId } = route.params

  const myUid       = useAuthStore((s) => s.user?.uid ?? '')
  const activeGroup = useGroupStore((s) => s.activeGroup)
  const groupId     = activeGroup?.id ?? ''

  const {
    lists,
    itemsByList,
    subscribeToList,
    addItem,
    toggleItem,
    claimItem,
    deleteItem,
    updateItem,
    updateList,
    archiveList,
    deleteList,
  } = useListStore()

  const list  = lists.find((l) => l.id === listId)
  const items = itemsByList[listId] ?? []
  const { members } = useGroupMembers(activeGroup?.memberIds ?? [])

  const [showCompleted, setShowCompleted] = useState(false)
  const [showEdit,      setShowEdit]      = useState(false)
  const [editingItem,   setEditingItem]   = useState<SharedListItem | null>(null)

  // Subscribe to items for this list
  useEffect(() => {
    if (groupId && listId) subscribeToList(groupId, listId)
  }, [groupId, listId, subscribeToList])

  // Update header title when list loads
  useEffect(() => {
    if (list) {
      navigation.setOptions({ title: list.title })
    }
  }, [list?.title, navigation, list])

  const { pendingItems, completedItems } = useMemo(() => ({
    pendingItems:   items.filter((i) => !i.checked),
    completedItems: items.filter((i) => i.checked),
  }), [items])

  // ── Handlers ─────────────────────────────────────────────────────

  const handleAdd = useCallback(async (itemText: string) => {
    await addItem(groupId, listId, itemText, myUid)
  }, [addItem, groupId, listId, myUid])

  const handleToggle = useCallback(async (itemId: string, checked: boolean) => {
    await toggleItem(groupId, listId, itemId, checked, myUid)
  }, [toggleItem, groupId, listId, myUid])

  const handleClaim = useCallback(async (itemId: string, uid: string | null) => {
    await claimItem(groupId, listId, itemId, uid)
  }, [claimItem, groupId, listId])

  const handleDelete = useCallback(async (itemId: string) => {
    await deleteItem(groupId, listId, itemId)
  }, [deleteItem, groupId, listId])

  const handleEdit = useCallback((item: SharedListItem) => {
    setEditingItem(item)
  }, [])

  const handleArchive = useCallback(() => {
    Alert.alert(
      'Archive list?',
      'The list will be archived. You can still view it from the archived section.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            await archiveList(groupId, listId)
            navigation.goBack()
          },
        },
      ],
    )
  }, [archiveList, groupId, listId, navigation])

  const handleDeleteList = useCallback(() => {
    Alert.alert(
      'Delete list?',
      'This will permanently delete the list and all its items. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteList(groupId, listId)
            navigation.goBack()
          },
        },
      ],
    )
  }, [deleteList, groupId, listId, navigation])

  const handleListMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Alert.alert(
      list?.title ?? 'List options',
      undefined,
      [
        { text: 'Edit list',     onPress: () => setShowEdit(true) },
        { text: 'Archive list',  onPress: handleArchive },
        { text: 'Delete list',   style: 'destructive', onPress: handleDeleteList },
        { text: 'Cancel',        style: 'cancel' },
      ],
    )
  }, [list?.title, handleArchive, handleDeleteList])

  const handleUpdateList = useCallback(async (data: SharedListCreate) => {
    if (!list) return
    await updateList(groupId, { id: list.id, title: data.title, type: data.type, description: data.description })
    setShowEdit(false)
  }, [list, updateList, groupId])

  // ── Render ────────────────────────────────────────────────────────

  if (!list) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accentPrimary} />
      </View>
    )
  }

  const meta = LIST_TYPE_META[list.type]

  const renderItem = ({ item }: { item: SharedListItem }) => (
    <ListItemRow
      item={item}
      myUid={myUid}
      members={members}
      groupId={groupId}
      listId={listId}
      onToggle={handleToggle}
      onClaim={handleClaim}
      onDelete={handleDelete}
      onEdit={handleEdit}
    />
  )

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgPrimary }]}>
      {/* Custom header bar */}
      <View style={[
        styles.header,
        {
          paddingTop:       insets.top + spacing.md,
          paddingHorizontal: spacing.lg,
          paddingBottom:    spacing.md,
          backgroundColor:  colors.bgSecondary,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        },
      ]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel="Back">
          <Text style={[text.body.lg, { color: colors.accentPrimary }]}>{'←'}</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={{ fontSize: 20 }}>{meta.emoji}</Text>
          <Text style={[text.body.lg, { color: colors.textPrimary, fontFamily: 'Outfit-SemiBold' }]} numberOfLines={1}>
            {list.title}
          </Text>
        </View>

        <Pressable onPress={handleListMenu} hitSlop={8} accessibilityLabel="List options">
          <Text style={[text.body.lg, { color: colors.textSecondary }]}>⋯</Text>
        </Pressable>
      </View>

      {/* Progress summary */}
      {list.itemCount > 0 && (
        <View style={[styles.progressSummary, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
          <View style={[styles.progressBar, { backgroundColor: colors.bgTertiary, borderRadius: 3 }]}>
            <View style={[
              styles.progressFill,
              {
                width: `${Math.round((list.checkedCount / list.itemCount) * 100)}%` as `${number}%`,
                backgroundColor: list.checkedCount === list.itemCount ? colors.accentPrimary : colors.accentPrimary + '88',
                borderRadius: 3,
              },
            ]} />
          </View>
          <Text style={[text.label.sm, { color: colors.textMuted, marginTop: 4 }]}>
            {list.checkedCount} of {list.itemCount} done
            {list.checkedCount === list.itemCount && list.itemCount > 0 ? '  🎉' : ''}
          </Text>
        </View>
      )}

      {/* Items list */}
      <FlatList
        data={pendingItems}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          pendingItems.length === 0 && completedItems.length === 0 ? (
            <View style={[styles.emptyState, { paddingHorizontal: spacing.xl }]}>
              <Text style={{ fontSize: 40, textAlign: 'center' }}>{meta.emoji}</Text>
              <Text style={[text.body.md, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md }]}>
                No items yet. Add one below.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          completedItems.length > 0 ? (
            <View style={{ marginTop: spacing.md }}>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowCompleted((v) => !v) }}
                style={[styles.completedHeader, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}
                accessibilityRole="button"
                accessibilityLabel={showCompleted ? 'Hide completed items' : 'Show completed items'}
              >
                <Text style={[text.label.md, { color: colors.textMuted, fontFamily: 'Outfit-SemiBold' }]}>
                  {showCompleted ? '▾' : '▸'} {completedItems.length} completed
                </Text>
              </Pressable>

              {showCompleted &&
                completedItems.map((item) => (
                  <ListItemRow
                    key={item.id}
                    item={item}
                    myUid={myUid}
                    members={members}
                    groupId={groupId}
                    listId={listId}
                    onToggle={handleToggle}
                    onClaim={handleClaim}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                  />
                ))
              }
            </View>
          ) : null
        }
      />

      {/* Add item bar */}
      <AddItemBar onAdd={handleAdd} placeholder={`Add to ${list.title}…`} />

      {/* Edit list sheet */}
      <CreateListSheet
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onSubmit={handleUpdateList}
        groupId={groupId}
        createdBy={myUid}
        editing={list}
      />

      {/* Edit item sheet — simple alert-based for now */}
      {editingItem && (
        <EditItemAlert
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={async (text, notes) => {
            await updateItem(groupId, listId, { id: editingItem.id, text, notes })
            setEditingItem(null)
          }}
        />
      )}
    </View>
  )
}

// ── Inline edit item (Alert-based) ───────────────────────────────────
// Keeps the file self-contained without a separate modal file.
// Can be promoted to a full sheet later without breaking anything.


function EditItemAlert({
  item, onClose, onSave,
}: {
  item:    SharedListItem
  onClose: () => void
  onSave:  (text: string, notes?: string) => Promise<void>
}) {
  const { colors, text: textStyles, spacing, radius } = useTheme()
  const insets  = useSafeAreaInsets()
  const [value, setValue]   = useState(item.text)
  const [notes, setNotes]   = useState(item.notes ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const t = value.trim()
    if (!t) return
    setSaving(true)
    try { await onSave(t, notes.trim() || undefined) }
    finally { setSaving(false) }
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kvWrapper}>
        <View style={[styles.editSheet, {
          backgroundColor:      colors.bgSecondary,
          paddingBottom:        insets.bottom + spacing.lg,
          borderTopLeftRadius:  radius.xl,
          borderTopRightRadius: radius.xl,
        }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text style={[textStyles.label.lg, { color: colors.textPrimary, marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.md }]}>
            Edit item
          </Text>

          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Item text"
            placeholderTextColor={colors.textMuted}
            style={[textStyles.body.md, {
              color:            colors.textPrimary,
              backgroundColor:  colors.bgTertiary,
              borderRadius:     radius.md,
              borderWidth:      1,
              borderColor:      colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical:  12,
              marginHorizontal: spacing.lg,
              marginBottom:     spacing.sm,
            }]}
            autoFocus
            returnKeyType="next"
          />

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.textMuted}
            style={[textStyles.body.md, {
              color:            colors.textPrimary,
              backgroundColor:  colors.bgTertiary,
              borderRadius:     radius.md,
              borderWidth:      1,
              borderColor:      colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical:  12,
              marginHorizontal: spacing.lg,
              marginBottom:     spacing.lg,
            }]}
          />

          <View style={[styles.editActions, { paddingHorizontal: spacing.lg, gap: spacing.sm }]}>
            <Pressable
              onPress={onClose}
              style={[styles.editBtn, { backgroundColor: colors.bgTertiary, borderRadius: radius.md, flex: 1 }]}
            >
              <Text style={[textStyles.body.md, { color: colors.textSecondary, textAlign: 'center' }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={!value.trim() || saving}
              style={[styles.editBtn, {
                backgroundColor: value.trim() ? colors.accentPrimary : colors.bgTertiary,
                borderRadius:    radius.md,
                flex:            1,
              }]}
            >
              {saving
                ? <ActivityIndicator color={colors.bgPrimary} size={16} />
                : <Text style={[textStyles.body.md, { color: value.trim() ? colors.bgPrimary : colors.textMuted, textAlign: 'center', fontFamily: 'Outfit-SemiBold' }]}>
                    Save
                  </Text>
              }
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen:          { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCenter:    { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  progressSummary: {},
  progressBar:     { height: 6 },
  progressFill:    { height: 6 },
  emptyState:      { paddingTop: 60, alignItems: 'center' },
  completedHeader: { flexDirection: 'row', alignItems: 'center' },
  backdrop:        { flex: 1, backgroundColor: 'rgba(8,12,20,0.6)' },
  kvWrapper:       { justifyContent: 'flex-end' },
  editSheet:       { paddingTop: 8 },
  handle:          { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  editActions:     { flexDirection: 'row' },
  editBtn:         { paddingVertical: 14, alignItems: 'center' },
})
