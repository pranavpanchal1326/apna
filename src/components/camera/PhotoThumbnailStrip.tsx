import { useEffect, useRef } from 'react'
import {
  ScrollView,
  View,
  Image,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native'
import { useTheme } from '../../theme'

interface PhotoThumbnailStripProps {
  uris: string[]
  uploadProgress?: Record<string, number>   // uri → 0–100
  onRemove(uri: string): void
  maxPhotos?: number
  onAddMore?: () => void
}

export function PhotoThumbnailStrip({
  uris,
  uploadProgress = {},
  onRemove,
  maxPhotos = 10,
  onAddMore,
}: PhotoThumbnailStripProps) {
  const { colors, spacing, radius, text } = useTheme()

  if (uris.length === 0) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, { gap: spacing.sm }]}
    >
      {uris.map((uri, index) => (
        <AnimatedThumbnail
          key={uri}
          uri={uri}
          index={index}
          progress={uploadProgress[uri]}
          onRemove={() => onRemove(uri)}
          radius={radius}
          colors={colors}
          textStyles={text}
        />
      ))}

      {/* Add More Slot */}
      {uris.length < maxPhotos && onAddMore && (
        <Pressable
          onPress={onAddMore}
          style={({ pressed }) => [
            styles.addSlot,
            {
              borderColor: colors.border,
              backgroundColor: colors.bgSecondary,
              borderRadius: radius.md,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          accessibilityLabel="Add more photos"
          accessibilityRole="button"
        >
          <Text style={[text.heading.sm, { color: colors.textSecondary, fontSize: 28 }]}>+</Text>
        </Pressable>
      )}
    </ScrollView>
  )
}

interface AnimatedThumbnailProps {
  uri: string
  index: number
  progress?: number
  onRemove(): void
  radius: Record<string, number>
  colors: any
  textStyles: Record<string, any>
}

function AnimatedThumbnail({
  uri,
  progress,
  onRemove,
  radius,
  colors,
  textStyles,
}: AnimatedThumbnailProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current

  // Slide and fade in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()
  }, [fadeAnim, slideAnim])

  const isUploading = progress !== undefined && progress > 0 && progress < 100
  const isUploaded = progress === 100

  return (
    <Animated.View
      style={[
        styles.thumbnailWrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      {/* Photo Image */}
      <Image source={{ uri }} style={[styles.image, { borderRadius: radius.md, borderColor: colors.border }]} />

      {/* Uploading Progress Overlay */}
      {isUploading && (
        <View style={[styles.overlay, { borderRadius: radius.md, backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <UploadingSpinner progress={progress ?? 0} colors={colors} textStyles={textStyles} />
        </View>
      )}

      {/* Uploaded Success Indicator Overlay */}
      {isUploaded && (
        <View style={[styles.successBadge, { backgroundColor: colors.accentPrimary, borderRadius: radius.full }]}>
          <Text style={styles.successBadgeText}>✓</Text>
        </View>
      )}

      {/* Remove Button */}
      {!isUploading && (
        <Pressable
          onPress={onRemove}
          style={[
            styles.removeBtn,
            {
              backgroundColor: colors.bgTertiary,
              borderRadius: radius.full,
              borderColor: colors.border,
            },
          ]}
          accessibilityLabel="Remove photo"
          accessibilityRole="button"
        >
          <Text style={[textStyles.label.sm, { color: colors.textPrimary, fontSize: 12, fontWeight: '700' }]}>×</Text>
        </Pressable>
      )}
    </Animated.View>
  )
}

function UploadingSpinner({ progress, colors, textStyles }: { progress: number; colors: any; textStyles: any }) {
  const spinAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    )
    animation.start()
    return () => animation.stop()
  }, [spinAnim])

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <View style={styles.spinnerContainer}>
      <Animated.View
        style={[
          styles.spinnerRing,
          {
            borderColor: colors.accentPrimary,
            borderTopColor: 'transparent',
            transform: [{ rotate: spin }],
          },
        ]}
      />
      <Text style={[textStyles.label.sm, { color: '#FFF', fontSize: 10, marginTop: 4, fontWeight: '700' }]}>
        {progress}%
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: 72,
    height: 72,
  },
  image: {
    width: 72,
    height: 72,
    borderWidth: 1,
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  successBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  successBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  addSlot: {
    width: 72,
    height: 72,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
})
