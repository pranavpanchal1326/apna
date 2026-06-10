// src/components/layouts/Header.tsx
import { View, Text, StyleSheet, Pressable, type ViewStyle } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'

interface HeaderProps {
  title: string
  onBack?: () => void
  showBack?: boolean
  rightAction?: React.ReactNode
  style?: ViewStyle
}

export function Header({
  title,
  onBack,
  showBack = false,
  rightAction,
  style,
}: HeaderProps) {
  const { colors, spacing, layout, text } = useTheme()
  const displayBack = showBack || Boolean(onBack)

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onBack?.()
  }

  return (
    <View
      style={[
        styles.container,
        {
          height: layout.headerHeight,
          backgroundColor: colors.bgPrimary,
          paddingHorizontal: spacing.lg,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        },
        style,
      ]}
    >
      {/* Left Back Button */}
      <View style={styles.leftContainer}>
        {displayBack && (
          <Pressable
            onPress={handleBackPress}
            style={styles.backButton}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            {/* Pure CSS Chevron Left */}
            <View
              style={[
                styles.chevron,
                { borderColor: colors.textPrimary },
              ]}
            />
          </Pressable>
        )}
      </View>

      {/* Center Title */}
      <View style={styles.titleContainer}>
        <Text
          style={[text.heading.sm, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {/* Right Actions */}
      <View style={styles.rightContainer}>
        {rightAction && <View style={styles.rightActionWrapper}>{rightAction}</View>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  leftContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevron: {
    width: 12,
    height: 12,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    transform: [{ rotate: '45deg' }],
    marginLeft: 4, // Visual offset to center it in the 44pt box
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContainer: {
    minWidth: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  rightActionWrapper: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
