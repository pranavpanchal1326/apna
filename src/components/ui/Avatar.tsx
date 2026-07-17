// src/components/ui/Avatar.tsx
// Kora & Ink Avatar — Blueprint §3.4. Thread-dye color keyed by uid hash
// (a friend is always their thread color). New `stitched` prop draws a 1.5pt
// stitch ring for "live on trip / sharing location" — replaces any green-dot
// presence convention. Overlap stacks (-8pt) order newest-first.
import { View, Text, Image, StyleSheet, type ViewStyle } from 'react-native'
import { useTheme } from '@theme'
import Svg, { Circle } from 'react-native-svg'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const AVATAR_SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
}

const FONT_SIZE_MAP: Record<AvatarSize, number> = {
  xs: 9,
  sm: 12,
  md: 15,
  lg: 18,
  xl: 24,
}

interface AvatarProps {
  name: string              // Used for initials fallback
  color: string             // Avatar background color (from user.avatarColor)
  imageUrl?: string         // Optional photo (Phase 4+)
  size?: AvatarSize
  /** Stitch ring — "live on trip / sharing location" (§3.4). */
  stitched?: boolean
  /** @deprecated use `stitched` — presence is now a stitch ring, not a dot */
  showOnlineDot?: boolean
  style?: ViewStyle
}

export function Avatar({
  name,
  color,
  imageUrl,
  size = 'md',
  stitched = false,
  showOnlineDot = false,
  style,
}: AvatarProps) {
  const { colors, radius } = useTheme()
  const dimension = AVATAR_SIZE_MAP[size]
  const fontSize = FONT_SIZE_MAP[size]
  const initial = name.trim().charAt(0).toUpperCase()
  const ring = stitched || showOnlineDot

  return (
    <View style={[{ width: dimension, height: dimension }, style]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.image,
            {
              width: dimension,
              height: dimension,
              borderRadius: radius.full,
            },
          ]}
          accessibilityLabel={`${name}'s avatar`}
        />
      ) : (
        <View
          style={[
            styles.initials,
            {
              width: dimension,
              height: dimension,
              borderRadius: radius.full,
              backgroundColor: color,
            },
          ]}
          accessible
          accessibilityLabel={`${name}'s avatar`}
        >
          <Text
            style={{
              fontSize,
              fontFamily: 'GeneralSans-Medium',
              color: colors.onAccent,
              lineHeight: fontSize * 1.2,
            }}
          >
            {initial}
          </Text>
        </View>
      )}

      {/* Stitch ring — live on trip / sharing location (§3.4) */}
      {ring && (
        <Svg
          width={dimension}
          height={dimension}
          style={StyleSheet.absoluteFill as object}
          pointerEvents="none"
        >
          <Circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={dimension / 2 - 1}
            stroke={colors.stitch}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      )}
    </View>
  )
}

// ── AvatarStack — up to 5 avatars overlapping, +N overflow ─────────
interface AvatarStackProps {
  members: Array<{ name: string; color: string; imageUrl?: string }>
  maxVisible?: number
  size?: AvatarSize
  style?: ViewStyle
}

export function AvatarStack({
  members,
  maxVisible = 5,
  size = 'sm',
  style,
}: AvatarStackProps) {
  const { colors, radius } = useTheme()
  const dimension = AVATAR_SIZE_MAP[size]
  const overlap = dimension * 0.35
  const visible = members.slice(0, maxVisible)
  const overflow = members.length - maxVisible

  return (
    <View
      style={[
        styles.stackRow,
        { height: dimension },
        style,
      ]}
    >
      {visible.map((member, index) => (
        <View
          key={`${member.name}-${index}`}
          style={[
            styles.stackItem,
            {
              left: index * (dimension - overlap),
              zIndex: maxVisible - index,
              borderRadius: radius.full,
              borderWidth: 2,
              borderColor: colors.bgPrimary,
            },
          ]}
        >
          <Avatar name={member.name} color={member.color} imageUrl={member.imageUrl} size={size} />
        </View>
      ))}

      {overflow > 0 && (
        <View
          style={[
            styles.stackItem,
            styles.overflowBadge,
            {
              left: visible.length * (dimension - overlap),
              width: dimension,
              height: dimension,
              borderRadius: radius.full,
              backgroundColor: colors.bgTertiary,
              borderWidth: 2,
              borderColor: colors.bgPrimary,
            },
          ]}
        >
          <Text
            style={{
              fontSize: FONT_SIZE_MAP[size] - 1,
              fontFamily: 'GeneralSans-Medium',
              color: colors.textSecondary,
            }}
          >
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackRow: {
    flexDirection: 'row',
    position: 'relative',
  },
  stackItem: {
    position: 'absolute',
  },
  overflowBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
