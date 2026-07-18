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
import { Sparkle, Camera, Images, GridFour, MapTrifold } from 'phosphor-react-native'
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
import { MemoriesMapView } from './MemoriesMapView'
import { nanoid } from 'nanoid/non-secure'
import type { MemoriesStackParamList } from '../../navigation/types'
import {
  MEMORY_MAX_PHOTOS,
  getMemoryPhotos,
  getMemoryThumbUrl,
  type MemoryInput,
} from '../../lib/schemas/memory.schema'

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
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
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

  // Merge newly picked URIs into the staged set, deduped, capped at 10 per post
  const stagePhotos = (uris: string[]) => {
    setStagedUris((prev) => {
      const merged = [...prev]
      for (const uri of uris) {
        if (!merged.includes(uri)) merged.push(uri)
      }
      if (merged.length > MEMORY_MAX_PHOTOS) {
        Alert.alert('Photo limit', `A memory can have up to ${MEMORY_MAX_PHOTOS} photos.`)
      }
      return merged.slice(0, MEMORY_MAX_PHOTOS)
    })
    setCaptionModalVisible(true)
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

      // Single memory post carrying 1–10 photos. Photos that failed to
      // upload keep url: '' and get patched by the offline upload queue.
      const photos = stagedUris.map((_, i) => {
        const storagePath = buildMemoryPhotoPath({ groupId, memoryId: basePostId, index: i })
        const match = uploadResults.find((r: { storagePath: string }) => r.storagePath === storagePath)
        return { url: match ? match.downloadUrl : '' }
      })
      const firstUploaded = photos.find((p) => p.url !== '')

      const ref = doc(memoriesCol(groupId), basePostId)

      const caption = captionText.trim()
      await setDoc(ref, {
        id: basePostId,
        groupId,
        type: 'photo',
        date: dateStr,
        photos,
        // Legacy field kept in sync so older readers still render the cover.
        // Firestore rejects `undefined` values, so optional fields are spread in.
        ...(firstUploaded ? { photoUrl: firstUploaded.url } : {}),
        uploadPending: photos.some((p) => p.url === ''),
        ...(caption ? { caption } : {}),
        takenBy: myUid,
        createdBy: myUid,
        reactions: {},
        createdAt: serverTimestamp(),
      })

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
          {item.map((memory) => {
            const photoCount = getMemoryPhotos(memory).length
            return (
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
                <Image source={{ uri: getMemoryThumbUrl(memory) }} style={[styles.gridImage, { borderRadius: radius.md }]} />
                {photoCount > 1 && (
                  <View style={styles.multiBadge}>
                    <Text style={styles.multiBadgeText}>⧉ {photoCount}</Text>
                  </View>
                )}
              </Pressable>
            )
          })}
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
        <View style={styles.onThisDayRow}>
          <Sparkle size={16} color={colors.textPrimary} />
          <Text style={[text.body.md, { color: colors.textPrimary, fontWeight: '700' }]}>
            On This Day
          </Text>
        </View>
        <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 4 }]}>
          Revisit memories from this exact date in prior years of this trip.
        </Text>
      </Pressable>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Camera size={64} color={colors.textMuted} />
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

      {/* Grid / Map view toggle */}
      {!isLoading && memories.length > 0 && (
        <View style={[styles.toggleRow, { paddingHorizontal: spacing.lg, marginTop: spacing.sm, gap: spacing.sm }]}>
          {(['grid', 'map'] as const).map((mode) => {
            const isActive = viewMode === mode
            return (
              <Pressable
                key={mode}
                onPress={() => {
                  Haptics.selectionAsync()
                  setViewMode(mode)
                }}
                style={[
                  styles.toggleChip,
                  {
                    backgroundColor: isActive ? colors.accentPrimary + '20' : colors.bgSecondary,
                    borderColor: isActive ? colors.accentPrimary : colors.border,
                    borderRadius: radius.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 6,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={mode === 'grid' ? 'Grid view' : 'Map view'}
              >
                <View style={styles.modeToggleRow}>
                  {mode === 'grid'
                    ? <GridFour size={15} color={isActive ? colors.accentPrimary : colors.textPrimary} />
                    : <MapTrifold size={15} color={isActive ? colors.accentPrimary : colors.textPrimary} />}
                  <Text style={[text.label.md, { color: isActive ? colors.accentPrimary : colors.textPrimary }]}>
                    {mode === 'grid' ? 'Grid' : 'Map'}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentPrimary} size="large" />
        </View>
      ) : viewMode === 'map' ? (
        <MemoriesMapView
          memories={memories}
          onOpenMemory={(memoryId) => navigation.navigate('MemoryDetail', { memoryId, groupId })}
        />
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
            <Camera size={20} color={colors.textSecondary} style={{ marginRight: spacing.md }} />
            <Text style={[text.body.lg, { color: colors.textPrimary }]}>Take photo</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setPickerVisible(false)
              setGalleryVisible(true)
            }}
            style={styles.sheetOption}
          >
            <Images size={20} color={colors.textSecondary} style={{ marginRight: spacing.md }} />
            <Text style={[text.body.lg, { color: colors.textPrimary }]}>Choose from gallery</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Native Camera Sheet */}
      <NativeCameraSheet
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onCapture={(uris) => {
          stagePhotos(uris)
        }}
      />

      {/* Media Picker Sheet */}
      <MediaPickerSheet
        visible={galleryVisible}
        onClose={() => setGalleryVisible(false)}
        onSelect={(uris) => {
          stagePhotos(uris)
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
  onThisDayRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modeToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },
  banner: {
    borderWidth: 1,
  },
  sectionHeader: {
    paddingVertical: 12,
  },
  toggleRow: {
    flexDirection: 'row',
  },
  toggleChip: {
    borderWidth: 1,
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
  multiBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  multiBadgeText: {
    color: 'rgba(255,255,255,1)',
    fontSize: 10,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,1)',
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
    shadowColor: 'rgba(0,0,0,1)',
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
