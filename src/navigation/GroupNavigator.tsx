// src/navigation/GroupNavigator.tsx
// Custom inner tab navigator for group feed and members.

import { useState, useCallback, useRef } from 'react'
import { View, Text, Animated, Pressable, StyleSheet, useWindowDimensions } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@theme'
import { Stitch } from '@components'
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
  const { colors, text, spacing, layout } = useTheme()
  const { width } = useWindowDimensions()
  const [activeTab, setActiveTab] = useState<Tab>('Feed')
  const stitchX = useRef(new Animated.Value(0)).current

  const tabWidth = (width - layout.screenPaddingH * 2) / TABS.length

  const handleTabPress = useCallback((tab: Tab, index: number) => {
    Haptics.selectionAsync()
    setActiveTab(tab)
    // Active tab carries a 12pt stitch dash beneath, sliding with Spring.snappy
    Animated.spring(stitchX, {
      toValue: index * tabWidth,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start()
  }, [tabWidth, stitchX])

  return (
    <View style={styles.container}>
      {/* Text tabs with a sliding stitch beneath the active one (§4.3.1) */}
      <View style={[styles.tabBarContainer, { paddingHorizontal: layout.screenPaddingH, marginVertical: spacing.md }]}>
        <View style={styles.tabBar}>
          {TABS.map((tab, index) => (
            <Pressable
              key={tab}
              onPress={() => handleTabPress(tab, index)}
              style={styles.tabButton}
              accessibilityRole="button"
              accessibilityLabel={`${tab} tab`}
              accessibilityState={{ selected: activeTab === tab }}
            >
              <Text
                style={[
                  text.label.lg,
                  {
                    color: activeTab === tab ? colors.textPrimary : colors.textMuted,
                    fontFamily: activeTab === tab ? 'GeneralSans-Medium' : 'GeneralSans-Regular',
                  },
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
          {/* The tab stitch — 12pt madder dash under the active tab */}
          <Animated.View
            style={[
              styles.tabStitch,
              { width: tabWidth, transform: [{ translateX: stitchX }] },
            ]}
            pointerEvents="none"
          >
            <Stitch length={12} tone="live" />
          </Animated.View>
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
    height: 44,
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabStitch: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
