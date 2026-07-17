// src/components/layouts/Header.tsx
// Kora & Ink Header — Blueprint §3.12. Transparent over fabric (no navBar fill
// at scroll-top). Back control: 36pt circular bgTertiary tile with Phosphor
// CaretLeft (kills the CSS-arrow glyph). Right side max two icon controls.
import { View, Text, StyleSheet, Pressable, type ViewStyle } from 'react-native'
import * as Haptics from 'expo-haptics'
import { CaretLeft } from 'phosphor-react-native'
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
  const { colors, layout, text } = useTheme()
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
          backgroundColor: 'transparent',
          paddingHorizontal: layout.screenPaddingH,
        },
        style,
      ]}
    >
      {/* Left Back Button */}
      <View style={styles.leftContainer}>
        {displayBack && (
          <Pressable
            onPress={handleBackPress}
            style={[styles.backTile, { backgroundColor: colors.bgTertiary }]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <CaretLeft size={20} color={colors.textPrimary} weight="regular" />
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
  backTile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
