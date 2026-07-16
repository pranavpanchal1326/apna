// src/screens/memories/MemoriesMapView.tsx
// Map view of location-tagged memories.
// Memories at (near-)identical coordinates group into one photo pin with a
// count badge — tap opens the memory directly (single) or a picker sheet.

import { memo, useMemo, useRef, useEffect, useState } from 'react'
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Dimensions } from 'react-native'
import MapboxGL from '@rnmapbox/maps'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../theme'
import { BottomSheet } from '@components/ui/BottomSheet'
import { getMemoryThumbUrl, getMemoryPhotos, type MemoryInput } from '../../lib/schemas/memory.schema'
import {
  groupMemoriesByLocation,
  getLocationBounds,
  type MemoryLocationGroup as LocationGroup,
} from '../../lib/utils/memoryLocations'

const SCREEN_WIDTH = Dimensions.get('window').width
const PIN_SIZE = 44

const MemoryPin = memo(function MemoryPin({
  group,
  onPress,
}: {
  group: LocationGroup
  onPress: (group: LocationGroup) => void
}) {
  const { colors, radius } = useTheme()
  const thumb = getMemoryThumbUrl(group.memories[0])

  return (
    <MapboxGL.PointAnnotation
      id={`memory-pin-${group.key}`}
      coordinate={[group.lng, group.lat]}
      anchor={{ x: 0.5, y: 1 }}
      onSelected={() => onPress(group)}
    >
      <View style={styles.pinWrapper}>
        <View
          style={[
            styles.pinPhotoFrame,
            {
              borderColor: colors.accentPrimary,
              backgroundColor: colors.bgTertiary,
              borderRadius: radius.md,
            },
          ]}
        >
          {thumb ? (
            <Image source={{ uri: thumb }} style={[styles.pinPhoto, { borderRadius: radius.md - 2 }]} />
          ) : (
            <Text style={{ fontSize: 18 }}>📸</Text>
          )}
          {group.memories.length > 1 && (
            <View style={[styles.countBadge, { backgroundColor: colors.accentPrimary }]}>
              <Text style={styles.countText}>{group.memories.length}</Text>
            </View>
          )}
        </View>
        <View style={[styles.pinTail, { borderTopColor: colors.accentPrimary }]} />
      </View>
    </MapboxGL.PointAnnotation>
  )
})

interface Props {
  memories: MemoryInput[]
  onOpenMemory: (memoryId: string) => void
}

export function MemoriesMapView({ memories, onOpenMemory }: Props) {
  const { colors, text, spacing, radius } = useTheme()
  const cameraRef = useRef<MapboxGL.Camera>(null)
  const [pickerGroup, setPickerGroup] = useState<LocationGroup | null>(null)

  const groups = useMemo(() => groupMemoriesByLocation(memories), [memories])
  const bounds = useMemo(() => getLocationBounds(groups), [groups])

  // Fit camera to all pins whenever the pin set changes
  useEffect(() => {
    if (bounds && cameraRef.current) {
      cameraRef.current.fitBounds(bounds.ne, bounds.sw, 60, 400)
    }
  }, [bounds])

  const handlePinPress = (group: LocationGroup) => {
    Haptics.selectionAsync()
    if (group.memories.length === 1) {
      onOpenMemory(group.memories[0].id)
    } else {
      setPickerGroup(group)
    }
  }

  if (groups.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ fontSize: 48, textAlign: 'center' }}>🗺️</Text>
        <Text style={[text.heading.sm, { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md }]}>
          No location-tagged memories
        </Text>
        <Text style={[text.body.md, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginHorizontal: spacing.xl }]}>
          Memories with a location appear as photo pins on this map.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Dark}
        logoEnabled={false}
        attributionPosition={{ bottom: 8, right: 8 }}
      >
        <MapboxGL.Camera ref={cameraRef} />
        {groups.map((group) => (
          <MemoryPin key={group.key} group={group} onPress={handlePinPress} />
        ))}
      </MapboxGL.MapView>

      {/* Multi-memory location picker */}
      <BottomSheet
        visible={pickerGroup !== null}
        onClose={() => setPickerGroup(null)}
        title={pickerGroup?.name || 'Memories here'}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          <View style={styles.pickerGrid}>
            {pickerGroup?.memories.map((m) => {
              const thumb = getMemoryThumbUrl(m)
              const count = getMemoryPhotos(m).length
              const size = (SCREEN_WIDTH - 16 * 2 - 6 * 2) / 3
              return (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setPickerGroup(null)
                    onOpenMemory(m.id)
                  }}
                  style={{ width: size, height: size, borderRadius: radius.md, overflow: 'hidden' }}
                >
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <View style={{ flex: 1, backgroundColor: colors.bgTertiary, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 24 }}>📸</Text>
                    </View>
                  )}
                  {count > 1 && (
                    <View style={styles.gridBadge}>
                      <Text style={styles.gridBadgeText}>⧉ {count}</Text>
                    </View>
                  )}
                </Pressable>
              )
            })}
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pinWrapper: { alignItems: 'center' },
  pinPhotoFrame: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  pinPhoto: { width: PIN_SIZE - 4, height: PIN_SIZE - 4 },
  countBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: '#080C14', fontSize: 10, fontWeight: '700' },
  gridBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  gridBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
})
