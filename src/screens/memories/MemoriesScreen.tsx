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
import { haptics } from '@lib/haptics'
import { useTheme } from '../../theme'
import { useMemoryStore } from '../../stores/memory.store'
import { useGroupStore } from '../../stores/group.store'
import { useAuthStore } from '../../stores/auth.store'
import {
  Header,
  Button,
  BottomSheet,
  NativeCameraSheet,
  MediaPickerSheet,
  PhotoThumbnailStrip,
  UploadProgressChip,
} from '@components'
import { usePhotoUpload } from '../../hooks/usePhotoUpload'
import { nanoid } from 'nanoid/non-secure'
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
  const { memories, isLoading, subscribeToGroup, unsubscribe } = useMemoryStore()

  // UI state
  const [pickerVisible, setPickerVisible] = useState(false)
  const [captionModalVisible, setCaptionModalVisible] = useState(false)
  const [cameraVisible, setCameraVisible] = useState(false)
  const [galleryVisible, setGalleryVisible] = useState(false)
  const [stagedUris, setStagedUris] = useState<string[]>([])
  const [captionText, setCaptionText] = useState('')

  const { state: uploadState, uploadPhotos, cancelUpload } = usePhotoUpload()

  const uploadProgressMap = useMemo(() => {
    const map: Record<string, number> = {}
    if (!uploadState.isUploading) {
      stagedUris.forEach((uri, idx) => {
        if (idx < uploadState.uploadedCount) {
          map[uri] = 100
        }
      })
      return map
    }

    stagedUris.forEach((uri, idx) => {
      if (idx < uploadState.uploadedCount) {
        map[uri] = 100
      } else if (idx === uploadState.uploadedCount) {
        const N = stagedUris.length
        const K = uploadState.uploadedCount
        const P = Math.min(100, Math.max(0, uploadState.progress * N - K * 100))
        map[uri] = P
      } else {
        map[uri] = 0
      }
    })
    return map
  }, [stagedUris, uploadState.isUploading, uploadState.uploadedCount, uploadState.progress])

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

  const handleRemoveUri = (uri: string) => {
    setStagedUris((prev) => prev.filter((u) => u !== uri))
  }

  // Close caption modal if staged URIs become empty
  useEffect(() => {
    if (captionModalVisible && stagedUris.length === 0 && !uploadState.isUploading) {
      setCaptionModalVisible(false)
    }
  }, [stagedUris.length, captionModalVisible, uploadState.isUploading])

  const handlePostMemory = async () => {
    if (stagedUris.length === 0 || !groupId) return

    try {
      const dateStr = new Date().toISOString().split('T')[0]
      const basePostId = nanoid()

      // Upload photos sequentially
      const uploadResults = await uploadPhotos({
        localUris: stagedUris,
        context: 'memory',
        groupId,
        referenceId: basePostId,
      })

      const { doc, setDoc, serverTimestamp } = require('firebase/firestore')
      const { memoriesCol } = require('../../lib/firebase/collections')
      const { buildMemoryPhotoPath } = require('../../lib/firebase/storage')

      for (let i = 0; i < stagedUris.length; i++) {
        const memoryId = `${basePostId}_${i}`
        const storagePath = buildMemoryPhotoPath({ groupId, memoryId: basePostId, index: i })
        const match = uploadResults.find((r: { storagePath: string }) => r.storagePath === storagePath)
        const photoUrl = match ? match.downloadUrl : ''
        const hasUploaded = !!match

        const ref = doc(memoriesCol(groupId), memoryId)

        await setDoc(ref, {
          id: memoryId,
          groupId,
          type: 'photo',
          date: dateStr,
          photoUrl,
          uploadPending: !hasUploaded,
          caption: captionText.trim() || undefined,
          takenBy: myUid,
          createdBy: myUid,
          reactions: {},
          createdAt: serverTimestamp(),
        })
      }

      haptics.memoryPosted()
      setCaptionModalVisible(false)
      setStagedUris([])
      setCaptionText('')
    } catch (err) {
      console.error('[MemoriesScreen] handlePostMemory error:', err)
      Alert.alert('Upload Failed', 'Failed to upload and post your memory. Please try again.')
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

      {/* Picker Options BottomSheet */}
      <BottomSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title="Add a Memory"
      >
        <View style={{ padding: spacing.md, gap: spacing.sm }}>
          <Pressable
            onPress={() => {
              setPickerVisible(false)
              setCameraVisible(true)
            }}
            style={[styles.sheetOption, { borderBottomColor: colors.border }]}
          >
            <Text style={{ fontSize: 20, marginRight: spacing.md }}>📸</Text>
            <Text style={[text.body.lg, { color: colors.textPrimary }]}>Take photo</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setPickerVisible(false)
              setGalleryVisible(true)
            }}
            style={styles.sheetOption}
          >
            <Text style={{ fontSize: 20, marginRight: spacing.md }}>🖼️</Text>
            <Text style={[text.body.lg, { color: colors.textPrimary }]}>Choose from gallery</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Native Camera Sheet */}
      <NativeCameraSheet
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onCapture={(uris) => {
          setStagedUris(uris)
          setCaptionModalVisible(true)
        }}
      />

      {/* Media Picker Sheet */}
      <MediaPickerSheet
        visible={galleryVisible}
        onClose={() => setGalleryVisible(false)}
        onSelect={(uris) => {
          setStagedUris(uris)
          setCaptionModalVisible(true)
        }}
      />

      {/* Caption modal */}
      <Modal
        visible={captionModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!uploadState.isUploading) {
            setCaptionModalVisible(false)
            setStagedUris([])
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary, borderRadius: radius.xl, padding: spacing.lg }]}>
            <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center' }]}>
              Add Caption
            </Text>

            {stagedUris.length > 0 && (
              <View style={{ marginVertical: spacing.md }}>
                <PhotoThumbnailStrip
                  uris={stagedUris}
                  uploadProgress={uploadProgressMap}
                  onRemove={handleRemoveUri}
                  onAddMore={() => {
                    setCaptionModalVisible(false)
                    setGalleryVisible(true)
                  }}
                />
              </View>
            )}

            <TextInput
              value={captionText}
              onChangeText={setCaptionText}
              placeholder="Write a caption... (optional)"
              placeholderTextColor={colors.textMuted}
              maxLength={200}
              editable={!uploadState.isUploading}
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

            <View style={[styles.modalActions, { marginTop: spacing.md, alignItems: 'center', gap: spacing.sm }]}>
              {uploadState.isUploading ? (
                <>
                  <UploadProgressChip
                    state="uploading"
                    progress={uploadState.progress}
                  />
                  <Button
                    label="Cancel"
                    variant="secondary"
                    onPress={cancelUpload}
                    style={{ flex: 1 }}
                  />
                </>
              ) : (
                <>
                  {uploadState.error && (
                    <UploadProgressChip
                      state="error"
                      onRetry={handlePostMemory}
                    />
                  )}
                  <Button
                    label="Cancel"
                    variant="secondary"
                    onPress={() => {
                      setCaptionModalVisible(false)
                      setStagedUris([])
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Post"
                    variant="primary"
                    onPress={handlePostMemory}
                    disabled={stagedUris.length === 0}
                    style={{ flex: 1 }}
                  />
                </>
              )}
            </View>
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
