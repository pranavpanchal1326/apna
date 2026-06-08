// src/navigation/GroupNavigator.tsx
// Custom inner tab navigator for group feed and members.

import { useState, useCallback, useRef } from 'react'
import { View, Text, Animated, Pressable, StyleSheet, useWindowDimensions } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { FeedTab } from '@screens/group/tabs/FeedTab'
import { MembersTab } from '@screens/group/tabs/MembersTab'
import type { GroupInput, SettlementBalance } from '@lib/schemas'

interface GroupNavigatorProps {
  group: GroupInput
  myUid: string
  balances: SettlementBalance[]
  onSettle: (withUid: string) => void
}

const TABS = ['Feed', 'Members'] as const
type Tab = typeof TABS[number]

export function GroupNavigator({ group, myUid, balances, onSettle }: GroupNavigatorProps) {
  const { colors, text, spacing, radius } = useTheme()
  const { width } = useWindowDimensions()
  const [activeTab, setActiveTab] = useState<Tab>('Feed')
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current

  const tabWidth = (width - spacing.lg * 2) / TABS.length

  const handleTabPress = useCallback((tab: Tab, index: number) => {
    Haptics.selectionAsync()
    setActiveTab(tab)
    Animated.spring(tabIndicatorAnim, {
      toValue: index * tabWidth,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start()
  }, [tabWidth, tabIndicatorAnim, spacing.lg])

  return (
    <View style={styles.container}>
      {/* Custom Tab Bar */}
      <View style={[styles.tabBarContainer, { paddingHorizontal: spacing.lg, marginVertical: spacing.md }]}>
        <View style={[styles.tabBar, { backgroundColor: colors.bgTertiary, borderRadius: radius.full }]}>
          {/* Slider indicator */}
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                width: tabWidth - 4, // account for padding
                backgroundColor: colors.bgSecondary,
                borderRadius: radius.full,
                transform: [{ translateX: tabIndicatorAnim }],
              },
            ]}
          />
          {TABS.map((tab, index) => (
            <Pressable
              key={tab}
              onPress={() => handleTabPress(tab, index)}
              style={styles.tabButton}
              accessibilityRole="button"
              accessibilityLabel={`${tab} tab`}
            >
              <Text
                style={[
                  text.label.lg,
                  {
                    color: activeTab === tab ? colors.textPrimary : colors.textMuted,
                    fontFamily: activeTab === tab ? 'Outfit-Bold' : 'Outfit-Regular',
                  },
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'Feed' ? (
          <FeedTab
            group={group}
            myUid={myUid}
            balances={balances}
            onSettle={onSettle}
            onViewMembers={() => handleTabPress('Members', 1)}
          />
        ) : (
          <MembersTab
            group={group}
            myUid={myUid}
            balances={balances}
            onSettle={onSettle}
          />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBarContainer: {
    width: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    position: 'relative',
    height: 48,
    padding: 4,
    alignItems: 'center',
  },
  tabIndicator: {
    position: 'absolute',
    height: 40,
    top: 4,
    left: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 1,
  },
})
