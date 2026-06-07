// App.tsx (project root)
import { View, StatusBar } from 'react-native'
import { ThemeProvider, useTheme } from '@theme'

/**
 * apna — Root Entry Point
 *
 * Prompt 0.2: Dhaga Design System wired.
 * Prompt 0.5: This file will be replaced with RootNavigator + QueryClientProvider + Sentry.
 */
function AppContent() {
  const { colors, isDark } = useTheme()
  
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.statusBar}
      />
      {/* TODO Prompt 0.5: <RootNavigator /> goes here */}
    </View>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
