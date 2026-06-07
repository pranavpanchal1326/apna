// src/components/ui/Badge.tsx
import { View, Text, StyleSheet, type ViewStyle } from 'react-native'
import { useTheme } from '@theme'
import type { ExpenseCategory } from '@lib/types'

export type BadgeVariant = 'primary' | 'danger' | 'gold' | 'muted' | 'category'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  category?: ExpenseCategory   // Used when variant === 'category'
  size?: 'sm' | 'md'
  style?: ViewStyle
}

export function Badge({
  label,
  variant = 'muted',
  category,
  size = 'md',
  style,
}: BadgeProps) {
  const { colors, spacing, radius, text } = useTheme()

  const bgColorMap: Record<BadgeVariant, string> = {
    primary:  `${colors.accentPrimary}20`,
    danger:   `${colors.accentDanger}20`,
    gold:     `${colors.accentGold}20`,
    muted:    colors.bgTertiary,
    category: category ? `${colors.category[category]}20` : colors.bgTertiary,
  }

  const textColorMap: Record<BadgeVariant, string> = {
    primary:  colors.accentPrimary,
    danger:   colors.accentDanger,
    gold:     colors.accentGold,
    muted:    colors.textSecondary,
    category: category ? colors.category[category] : colors.textSecondary,
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColorMap[variant],
          borderRadius: radius.full,
          paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
          paddingVertical: size === 'sm' ? 2 : spacing.xs,
        },
        style,
      ]}
    >
      <Text
        style={[
          size === 'sm' ? text.label.sm : text.label.md,
          { color: textColorMap[variant] },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  )
}

// ── Count Badge — circular notification count ────────────────────
interface CountBadgeProps {
  count: number
  style?: ViewStyle
}

export function CountBadge({ count, style }: CountBadgeProps) {
  const { colors, radius } = useTheme()
  if (count <= 0) return null
  const display = count > 99 ? '99+' : String(count)

  return (
    <View
      style={[
        styles.countBadge,
        {
          backgroundColor: colors.accentDanger,
          borderRadius: radius.full,
          minWidth: 18,
          height: 18,
          paddingHorizontal: 4,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: 10,
          fontFamily: 'Outfit-Bold',
          lineHeight: 18,
          textAlign: 'center',
        }}
      >
        {display}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
