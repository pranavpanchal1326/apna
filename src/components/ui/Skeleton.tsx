// src/components/ui/Skeleton.tsx
import { useEffect, useRef } from 'react'
import { Animated, type ViewStyle, type DimensionValue } from 'react-native'
import { useTheme } from '@theme'

interface SkeletonProps {
  width: DimensionValue
  height: DimensionValue
  borderRadius?: number
  style?: ViewStyle
}

export function Skeleton({
  width,
  height,
  borderRadius,
  style,
}: SkeletonProps) {
  const { colors, radius } = useTheme()
  const opacityAnim = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    )
    
    animation.start()

    return () => animation.stop()
  }, [opacityAnim])

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? radius.sm,
          backgroundColor: colors.bgTertiary,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  )
}
