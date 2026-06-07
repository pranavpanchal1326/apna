// src/components/layouts/Screen.tsx
import { View, StyleSheet, ScrollView, StatusBar, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@theme'

interface ScreenProps {
  children: React.ReactNode
  withScroll?: boolean
  style?: ViewStyle
  contentContainerStyle?: ViewStyle
  edges?: Array<'top' | 'right' | 'bottom' | 'left'>
}

export function Screen({
  children,
  withScroll = false,
  style,
  contentContainerStyle,
  edges = ['top', 'bottom', 'left', 'right'],
}: ScreenProps) {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()

  const containerStyle = {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  }

  const paddingStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  }

  return (
    <View style={[containerStyle, style]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.statusBar}
      />
      {withScroll ? (
        <ScrollView
          style={[styles.scrollView, paddingStyle]}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, paddingStyle, contentContainerStyle]}>
          {children}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
})
