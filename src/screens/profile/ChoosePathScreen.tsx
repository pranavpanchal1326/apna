// src/screens/profile/ChoosePathScreen.tsx
// Onboarding path decision card interface — allows new users to Create or Join a group, or Skip to dashboard.

import { useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
} from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from 'expo-haptics'
import Constants from 'expo-constants'
import { useTheme } from '@theme'
import { Screen } from '@components'
import { track } from '@lib/analytics'
import type { HomeStackParamList } from '@navigation/types'

type Nav = NativeStackNavigationProp<HomeStackParamList, 'ChoosePath'>
type Route = RouteProp<HomeStackParamList, 'ChoosePath'>

export function ChoosePathScreen() {
  const { colors, spacing, radius, text, shadows } = useTheme()
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()

  const inviteCode = route.params?.inviteCode ?? null
  const startTimeRef = useRef<number>(Date.now())

  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const cardCreateAnim = useRef(new Animated.Value(0)).current
  const cardJoinAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Play entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(cardCreateAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(cardJoinAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const handleSelectPath = (choice: 'create' | 'join' | 'skip') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    
    const elapsed = Date.now() - startTimeRef.current
    track('group_choice_selected', {
      selection: choice,
      elapsed_ms: elapsed,
      has_invite_code: Boolean(inviteCode),
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version ?? '1.0.0',
      step_index: 4,
    })

    if (choice === 'create') {
      navigation.navigate('CreateGroup')
    } else if (choice === 'join') {
      navigation.navigate('JoinGroup')
    } else {
      // User skips to empty dashboard
      // Mark as skipped in route or navigate directly to HomeList
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeList', params: { skipped: true } }],
      })
    }
  }

  const createScale = cardCreateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  })

  const joinScale = cardJoinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  })

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <Animated.View style={[styles.container, { opacity: fadeAnim, paddingHorizontal: spacing['2xl'] }]}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[text.heading.lg, { color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm }]}>
            How would you{'\n'}like to start?
          </Text>
          <Text style={[text.body.md, { color: colors.textSecondary, textAlign: 'center', maxWidth: 280, alignSelf: 'center' }]}>
            apna works best when shared. Join a squad or build your own.
          </Text>
        </View>

        {/* Path Choice Cards */}
        <View style={[styles.cardsContainer, { gap: spacing.lg }]}>
          
          {/* Card 1: Create a Group */}
          <Animated.View style={{ transform: [{ scale: createScale }], opacity: cardCreateAnim }}>
            <Pressable
              onPress={() => handleSelectPath('create')}
              style={({ pressed }) => [
                styles.choiceCard,
                {
                  backgroundColor: colors.bgSecondary,
                  borderColor: colors.border,
                  borderRadius: radius.xl,
                  padding: spacing.xl,
                  opacity: pressed ? 0.92 : 1,
                  ...shadows.card,
                },
              ]}
            >
              <View style={[styles.emojiWrapper, { backgroundColor: colors.bgTertiary, borderRadius: radius.lg }]}>
                <Text style={styles.emoji}>✈️</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={[text.heading.sm, { color: colors.textPrimary }]}>Create a Group</Text>
                <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 4, lineHeight: 18 }]}>
                  Start a new shared space for your trip, roommate squad, or office project.
                </Text>
              </View>
            </Pressable>
          </Animated.View>

          {/* Card 2: Join a Group */}
          <Animated.View style={{ transform: [{ scale: joinScale }], opacity: cardJoinAnim }}>
            <Pressable
              onPress={() => handleSelectPath('join')}
              style={({ pressed }) => [
                styles.choiceCard,
                {
                  backgroundColor: colors.bgSecondary,
                  borderColor: inviteCode ? colors.accentPrimary : colors.border,
                  borderWidth: inviteCode ? 1.5 : 1,
                  borderRadius: radius.xl,
                  padding: spacing.xl,
                  opacity: pressed ? 0.92 : 1,
                  ...shadows.card,
                },
              ]}
            >
              {inviteCode && (
                <View style={[styles.badge, { backgroundColor: colors.accentPrimary, borderRadius: radius.full }]}>
                  <Text style={[text.label.sm, { color: colors.bgPrimary, fontWeight: '700' }]}>INVITATION FOUND</Text>
                </View>
              )}
              
              <View style={[styles.emojiWrapper, { backgroundColor: colors.bgTertiary, borderRadius: radius.lg }]}>
                <Text style={styles.emoji}>🔗</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={[text.heading.sm, { color: colors.textPrimary }]}>Join a Group</Text>
                <Text style={[text.body.sm, { color: colors.textSecondary, marginTop: 4, lineHeight: 18 }]}>
                  Enter an invite code or link shared by a friend to jump straight in.
                </Text>
              </View>
            </Pressable>
          </Animated.View>

        </View>

        {/* Skip button */}
        <View style={styles.footer}>
          <Pressable
            onPress={() => handleSelectPath('skip')}
            style={({ pressed }) => [
              styles.skipBtn,
              { opacity: pressed ? 0.6 : 1, paddingVertical: spacing.md },
            ]}
          >
            <Text style={[text.label.md, { color: colors.textSecondary, fontWeight: '600' }]}>
              Skip to Dashboard
            </Text>
          </Pressable>
        </View>

      </Animated.View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 30,
  },
  header: {
    marginBottom: 40,
  },
  cardsContainer: {
    width: '100%',
  },
  choiceCard: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -12,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  emojiWrapper: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  emoji: {
    fontSize: 26,
  },
  cardContent: {
    flex: 1,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
