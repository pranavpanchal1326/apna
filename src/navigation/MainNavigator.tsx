// src/navigation/MainNavigator.tsx
import { View, Pressable, StyleSheet, Text } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { BlurView } from 'expo-blur'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import type { MainTabParamList } from './types'
import { useTheme } from '@theme'
import * as Haptics from 'expo-haptics'
import { useGroupStore } from '@stores/group.store'

// Placeholder screens — content built in Phases 1–4
import { HomeNavigator }  from './HomeNavigator'
import { BudgetScreen }   from '@screens/budget/BudgetScreen'
import { ItineraryStack }  from './ItineraryStack'
import { ListsStack }     from './ListsStack'
import { MemoriesScreen } from '@screens/memories/MemoriesScreen'
import { ProfileScreen }  from '@screens/profile/ProfileScreen'

const Tab = createBottomTabNavigator<MainTabParamList>()

// ── Tab icons — SVG inline, no external icon library dependency ──
const TAB_ICONS: Record<keyof MainTabParamList, (active: boolean, color: string) => React.ReactNode> = {
  HomeTab: (_active, color) => (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      {/* Home — simple house silhouette */}
      <Text style={{ fontSize: 20, color }}>⌂</Text>
    </View>
  ),
  Budget: (_active, color) => (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, color }}>₹</Text>
    </View>
  ),
  Trip: (_active, color) => (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, color }}>✈</Text>
    </View>
  ),
  Lists: (_active, color) => (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 17, color }}>☑</Text>
    </View>
  ),
  Memories: (_active, color) => (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, color }}>◎</Text>
    </View>
  ),
  Profile: (_active, color) => (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, color }}>○</Text>
    </View>
  ),
}

// ── Custom Tab Bar ────────────────────────────────────────────────
// PRD §7: tabBarHeight=56, dot indicator below active icon, no labels
function DhagaTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, spacing, layout } = useTheme()

  return (
    <View
      style={[
        styles.tabBarOuter,
        {
          height: layout.tabBarHeight + layout.safeAreaBottom,
          paddingBottom: layout.safeAreaBottom,
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
      ]}
    >
      {/* Blur layer — only on Android API 31+ (2026 devices all qualify) */}
      <BlurView
        intensity={20}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />

      {/* Tab items */}
      <View style={styles.tabBarInner}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index
          const iconColor = isFocused ? colors.tabIconActive : colors.tabIconInactive

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })
            if (!isFocused && !event.defaultPrevented) {
              Haptics.selectionAsync()
              navigation.navigate(route.name)
            }
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              accessible
              accessibilityRole="tab"
              accessibilityLabel={route.name}
              accessibilityState={{ selected: isFocused }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {TAB_ICONS[route.name as keyof MainTabParamList]?.(isFocused, iconColor)}

              {/* Dhaga dot — active indicator */}
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isFocused ? colors.tabDot : 'transparent',
                    marginTop: spacing.xs,
                  },
                ]}
              />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ── Main Tab Navigator ────────────────────────────────────────────
export function MainNavigator() {
  const activeGroup = useGroupStore((s) => s.activeGroup)
  const tripModeActive = Boolean(
    activeGroup?.status === 'active' &&
    activeGroup.startDate &&
    activeGroup.endDate,
  )

  return (
    <Tab.Navigator
      tabBar={(props) => <DhagaTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,  // Don't render tab screen until first visited
      }}
    >
      <Tab.Screen name="HomeTab"  component={HomeNavigator} />
      <Tab.Screen name="Budget"   component={BudgetScreen} />
      {tripModeActive && (
        <Tab.Screen name="Trip" component={ItineraryStack} />
      )}
      <Tab.Screen name="Lists"    component={ListsStack} />
      <Tab.Screen name="Memories" component={MemoriesScreen} />
      <Tab.Screen name="Profile"  component={ProfileScreen} />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  tabBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
})
