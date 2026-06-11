// src/screens/memories/MemoriesScreen.tsx
// Responsive group photo gallery grid with chronological dividers,
// "On This Day" banner, and FAB upload interface.

import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  View,
  Text,
  SectionList,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '../../theme'
import { useMemoryStore } from '../../stores/memory.store'
import { useGroupStore } from '../../stores/group.store'
import { useAuthStore } from '../../stores/auth.store'
import { Header, Button, BottomSheet } from '@components'
import { uploadMemoryPhoto } from '../../lib/firebase/storage'
import { compressReceiptImage } from '../../lib/utils/imageCompression'
import type { MemoriesStackParamList } from '../../navigation/types'
import type { MemoryInput } from '../../lib/schemas/memory.schema'

type Nav = NativeStackNavigationProp<MemoriesStackParamList>
type Route = RouteProp<MemoriesStackParamList, 'MemoriesHome'>

const SCREEN_WIDTH = Dimensions.get('window').width

interface Section {
  title: string
  data: MemoryInput[][]
}

export function MemoriesScreen() {
  const { colors, text, spacing, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()

  // Resolve Group ID
  const routeGroupId = route.params?.groupId
  const activeGroupId = useGroupStore((s) => s.activeGroup?.id)
  const groupId = routeGroupId || activeGroupId || ''

  const myUid = useAuthStore((s) => s.user?.uid ?? '')

  // Zustand Memory Store
  const { memories, isLoading, subscribeToGroup, unsubscribe, addMemory } = useMemoryStore()

  // UI state
  const [pickerVisible, setPickerVisible] = useState(false)
  const [captionModalVisible, setCaptionModalVisible] = useState(false)
  const [stagedPhotoUri, setStagedPhotoUri] = useState<string | null>(null)
  const [captionText, setCaptionText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadPercent, setUploadPercent] = useState(0)

  // Subscribe to memories
  useEffect(() => {
    if (groupId) {
      subscribeToGroup(groupId)
      return () => unsubscribe()
    }
  }, [groupId, subscribeToGroup, unsubscribe])

  // "On This Day" logic: Check if prior years contain memories on MM-DD
  const hasOnThisDay = useMemo(() => {
    if (!memories.length) return false
    const today = new Date()
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0')
    const currentDay = String(today.getDate()).padStart(2, '0')
    return memories.some((m) => {
      const parts = m.date.split('-')
      if (parts.length !== 3) return false
      const yr = Number(parts[0])
      const mo = parts[1]
      const dy = parts[2]
      return yr < today.getFullYear() && mo === currentMonth && dy === currentDay
    })
  }, [memories])

  // Group into chronological sections and chunk each section into rows of 3
  const sectionedData = useMemo(() => {
    const groups: Record<string, MemoryInput[]> = {}
    
    // Sort memories descending (newest first)
    const sorted = [...memories].sort((a, b) => {
      const dateComp = b.date.localeCompare(a.date)
      if (dateComp !== 0) return dateComp
      const aSec = (a.createdAt as any)?.seconds ?? 0
      const bSec = (b.createdAt as any)?.seconds ?? 0
      return bSec - aSec
    })

    sorted.forEach((m) => {
      // Parse YYYY-MM-DD
      const dateParts = m.date.split('-')
      if (dateParts.length !== 3) return
      const dateObj = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]))
      const sectionTitle = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' })
      if (!groups[sectionTitle]) {
        groups[sectionTitle] = []
      }
      groups[sectionTitle].push(m)
    })

    const sections: Section[] = []
    Object.entries(groups).forEach(([title, items]) => {
      const rows: MemoryInput[][] = []
      for (let i = 0; i < items.length; i += 3) {
        rows.push(items.slice(i, i + 3))
      }
      sections.push({ title, data: rows })
    })

    return sections
  }, [memories])

  // Image upload pipeline
  const processSelectedImage = async (uri: string) => {
    try {
      setStagedPhotoUri(uri)
      setCaptionText('')
      setPickerVisible(false)
      setCaptionModalVisible(true)
    } catch (err) {
      console.error('[MemoriesScreen] processSelectedImage error:', err)
      Alert.alert('Error', 'Failed to read image.')
    }
  }

  const pickImage = async (useCamera: boolean) => {
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permission.granted) {
        Alert.alert(
          'Permission Denied',
          `Apna needs access to your ${useCamera ? 'camera' : 'gallery'} to add photos.`
        )
        return
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.9,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.9,
          })

      if (result.canceled || !result.assets?.[0]?.uri) return

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      await processSelectedImage(result.assets[0].uri)
    } catch (err) {
      console.error('[MemoriesScreen] pickImage error:', err)
      Alert.alert('Error', 'Failed to pick image.')
    }
  }

  const handlePostMemory = async () => {
    if (!stagedPhotoUri || !groupId) return
    setIsUploading(true)
    setUploadPercent(0)

    try {
      // 1. Compress image client-side to keep under 5MB limit
      const compressed = await compressReceiptImage(stagedPhotoUri)
      
      // 2. Generate a random ID for the memory and storage filename
      const memoryId = Math.random().toString(36).substring(7)
      
      // 3. Upload photo to storage
      const downloadUrl = await uploadMemoryPhoto(groupId, memoryId, compressed.uri, (pct) => {
        setUploadPercent(pct)
      })

      // Today as YYYY-MM-DD
      const dateStr = new Date().toISOString().split('T')[0]

      // 4. Create document in Firestore
      await addMemory(groupId, {
        groupId,
        createdAt: undefined,
        type: 'photo',
        date: dateStr,
        photoUrl: downloadUrl,
        caption: captionText.trim() || undefined,
        takenBy: myUid,
        createdBy: myUid,
      })

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setCaptionModalVisible(false)
      setStagedPhotoUri(null)
      setCaptionText('')
    } catch (err) {
      console.error('[MemoriesScreen] handlePostMemory error:', err)
      Alert.alert('Upload Failed', 'Failed to upload and post your memory. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // Row renderer
  const renderRow = useCallback(
    ({ item }: { item: MemoryInput[] }) => {
      const margin = 2
      const imgWidth = (SCREEN_WIDTH - spacing.lg * 2 - margin * 4) / 3

      return (
        <View style={styles.gridRow}>
          {item.map((memory) => (
            <Pressable
              key={memory.id}
              onPress={() => {
                Haptics.selectionAsync()
                navigation.navigate('MemoryDetail', { memoryId: memory.id, groupId })
              }}
              style={({ pressed }) => [
                styles.gridImageBtn,
                { width: imgWidth, height: imgWidth, borderRadius: radius.md, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Image source={{ uri: memory.photoUrl }} style={[styles.gridImage, { borderRadius: radius.md }]} />
            </Pressable>
          ))}
          {/* Pad empty elements if last row is incomplete */}
          {item.length < 3 &&
            Array.from({ length: 3 - item.length }).map((_, idx) => (
              <View key={`empty-${idx}`} style={{ width: imgWidth, height: imgWidth }} />
            ))}
        </View>
      )
    },
    [groupId, navigation, spacing.lg, radius.md]
  )

  const renderSectionHeader = useCallback(
    ({ section: { title } }: { section: { title: string } }) => (
      <View style={[styles.sectionHeader, { backgroundColor: colors.bgPrimary, paddingHorizontal: spacing.lg }]}>
        <Text style={[text.label.sm, { color: colors.accentPrimary, fontWeight: '700' }]}>{title.toUpperCase()}</Text>
      </View>
    ),
    [colors.bgPrimary, colors.accentPrimary, spacing.lg, text.label.sm]
  )

  const renderListHeader = () => {
    if (!hasOnThisDay) return null
    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          navigation.navigate('OnThisDay', { groupId })
        }}
        style={[
          styles.banner,
          {
            backgroundColor: colors.accentPrimary + '15',
            borderColor: colors.accentPrimary,
            borderRadius: radius.lg,
            marginHorizontal: spacing.lg,
            marginTop: spacing.md,
            padding: spacing.md,
          },
        ]}
      >
        <Text style={[text.body.md, { color: colors.textPrimary, fontWeight: '700' }]}>
          ✨ On This Day
        </Text>
        <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 4 }]}>
          Revisit memories from this exact date in prior years of this trip.
        </Text>
      </Pressable>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={{ fontSize: 64, textAlign: 'center' }}>📸</Text>
      <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md }]}>
        Capture the Moment
      </Text>
      <Text style={[text.body.md, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginHorizontal: spacing.xl }]}>
        Post photos of your trip. Everyone's uploads compile into a shared live feed here.
      </Text>
    </View>
  )

  const showBack = navigation.canGoBack()

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgPrimary }]}>
      <Header
        title="Memories"
        showBack={showBack}
        onBack={showBack ? () => navigation.goBack() : undefined}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentPrimary} size="large" />
        </View>
      ) : (
        <SectionList
          sections={sectionedData}
          keyExtractor={(item, idx) => item[0]?.id || String(idx)}
          renderItem={renderRow}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: spacing.sm }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* FAB */}
      {!isLoading && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            setPickerVisible(true)
          }}
          style={[
            styles.fab,
            {
              backgroundColor: colors.accentPrimary,
              borderRadius: radius.full,
              bottom: insets.bottom + spacing.lg,
              right: spacing.lg,
            },
          ]}
          accessibilityLabel="Add memory"
          accessibilityRole="button"
        >
          <Text style={{ color: colors.bgPrimary, fontSize: 24, fontWeight: '600', lineHeight: 28 }}>+</Text>
        </Pressable>
      )}

      {/* Picker BottomSheet */}
      <BottomSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title="Add a Memory"
      >
        <View style={{ padding: spacing.md, gap: spacing.sm }}>
          <Pressable
            onPress={() => pickImage(true)}
            style={[styles.sheetOption, { borderBottomColor: colors.border }]}
          >
            <Text style={{ fontSize: 20, marginRight: spacing.md }}>📸</Text>
            <Text style={[text.body.lg, { color: colors.textPrimary }]}>Take photo</Text>
          </Pressable>

          <Pressable
            onPress={() => pickImage(false)}
            style={styles.sheetOption}
          >
            <Text style={{ fontSize: 20, marginRight: spacing.md }}>🖼️</Text>
            <Text style={[text.body.lg, { color: colors.textPrimary }]}>Choose from gallery</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Caption modal */}
      <Modal
        visible={captionModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!isUploading) setCaptionModalVisible(false)
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary, borderRadius: radius.xl, padding: spacing.lg }]}>
            <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center' }]}>
              Add Caption
            </Text>

            {stagedPhotoUri && (
              <Image source={{ uri: stagedPhotoUri }} style={[styles.stagedPreview, { borderRadius: radius.lg, marginVertical: spacing.md }]} />
            )}

            <TextInput
              value={captionText}
              onChangeText={setCaptionText}
              placeholder="Write a caption... (optional)"
              placeholderTextColor={colors.textMuted}
              maxLength={200}
              editable={!isUploading}
              multiline
              style={[
                styles.captionInput,
                {
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  fontFamily: 'Outfit-Regular',
                },
              ]}
            />

            {isUploading ? (
              <View style={{ marginVertical: spacing.md, alignItems: 'center' }}>
                <ActivityIndicator color={colors.accentPrimary} />
                <Text style={[text.label.sm, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                  Uploading... {uploadPercent}%
                </Text>
              </View>
            ) : (
              <View style={[styles.modalActions, { marginTop: spacing.md }]}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => setCaptionModalVisible(false)}
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <Button
                  label="Post"
                  variant="primary"
                  onPress={handlePostMemory}
                  style={{ flex: 1 }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },
  banner: {
    borderWidth: 1,
  },
  sectionHeader: {
    paddingVertical: 12,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginHorizontal: 14,
    marginVertical: 2,
    gap: 3,
  },
  gridImageBtn: {
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  stagedPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  captionInput: {
    borderWidth: 1,
    minHeight: 60,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})
