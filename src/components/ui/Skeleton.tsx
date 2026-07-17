// src/components/ui/Skeleton.tsx
// Kora & Ink "loom" skeleton — Blueprint §3.9. Rows of bgSecondary bars whose
// shimmer is a diagonal pass of stitchDim at 12% opacity, 1200ms loop,
// staggered 80ms per row. Skeletons match the exact geometry of the loaded
// Row so load completion is a crossfade, not a reflow.

import { useEffect, useRef } from 'react'
import { Animated, View, StyleSheet, type ViewStyle, type DimensionValue } from 'react-native'
import { useTheme } from '@theme'

interface SkeletonProps {
  width: DimensionValue
  height: DimensionValue
  borderRadius?: number
  /** Stagger index — rows shimmer 80ms apart (§3.9). */
  index?: number
  style?: ViewStyle
}

export function Skeleton({
  width,
  height,
  borderRadius,
  index = 0,
  style,
}: SkeletonProps) {
  const { colors, radius } = useTheme()
  const shimmer = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(index * 80),
        Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [shimmer, index])

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ['-100%', '100%'],
  })

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? radius.soft,
          backgroundColor: colors.bgSecondary,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* diagonal weft-thread pass */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill as object,
          {
            backgroundColor: colors.stitchDim,
            opacity: 0.12,
            transform: [{ translateX }, { rotate: '12deg' }, { scaleX: 0.6 }],
          },
        ]}
      />
    </View>
  )
}

// Loom row skeleton — matches Row geometry (§3.9): 40pt tile, title 60%,
// trailing amount ~56pt. Drop N of these in for a loading list.
interface SkeletonRowProps {
  index?: number
  dense?: boolean
}

export function SkeletonRow({ index = 0, dense = false }: SkeletonRowProps) {
  const { spacing, layout } = useTheme()
  return (
    <View
      style={[
        rowStyles.row,
        { minHeight: dense ? layout.rowHeightDense : layout.rowHeight },
      ]}
    >
      <Skeleton width={40} height={40} index={index} />
      <View style={{ flex: 1, marginLeft: spacing.md, gap: 6 }}>
        <Skeleton width="60%" height={14} index={index} />
        <Skeleton width="40%" height={11} index={index} />
      </View>
      <Skeleton width={56} height={16} index={index} style={{ marginLeft: spacing.md }} />
    </View>
  )
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
