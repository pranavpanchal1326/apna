// src/components/ui/Avatar.tsx
import { View, Text, Image, StyleSheet, type ViewStyle } from 'react-native'
import { useTheme } from '@theme'

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
  showOnlineDot?: boolean   // Green dot for "live" location sharing status
  style?: ViewStyle
}

export function Avatar({
  name,
  color,
  imageUrl,
  size = 'md',
  showOnlineDot = false,
  style,
}: AvatarProps) {
  const { radius } = useTheme()
  const dimension = AVATAR_SIZE_MAP[size]
  const fontSize = FONT_SIZE_MAP[size]
  const initial = name.trim().charAt(0).toUpperCase()

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
              fontFamily: 'Outfit-Bold',
              color: '#080C14',
              lineHeight: fontSize * 1.2,
            }}
          >
            {initial}
          </Text>
        </View>
      )}

      {/* Online dot — shown when location sharing is active */}
      {showOnlineDot && (
        <View
          style={[
            styles.onlineDot,
            {
              width: dimension * 0.28,
              height: dimension * 0.28,
              borderRadius: radius.full,
              bottom: 0,
              right: 0,
            },
          ]}
        />
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
              borderWidth: 1.5,
              borderColor: colors.bgSecondary,
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
              borderWidth: 1.5,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={{
              fontSize: FONT_SIZE_MAP[size] - 1,
              fontFamily: 'Outfit-Medium',
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
  onlineDot: {
    position: 'absolute',
    backgroundColor: '#4ADE80',
    borderWidth: 1.5,
    borderColor: '#080C14',
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
