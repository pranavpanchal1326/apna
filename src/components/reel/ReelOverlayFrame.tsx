// src/components/reel/ReelOverlayFrame.tsx
// Branded title and closing frames for reel composition.

import { StyleSheet, View, Text } from 'react-native'
import type { ReelPlan } from '@lib/reel/types'

export const REEL_FRAME_WIDTH = 360
export const REEL_FRAME_HEIGHT = 640

interface ReelOverlayFrameProps {
  plan: ReelPlan
  variant: 'title' | 'closing'
}

export function ReelOverlayFrame({ plan, variant }: ReelOverlayFrameProps) {
  if (variant === 'title') {
    return (
      <View style={styles.card}>
        <View style={styles.thread} />
        <View style={styles.inner}>
          <Text style={styles.emoji}>{plan.coverEmoji || '✈️'}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {plan.tripName}
          </Text>
          {plan.destination ? (
            <Text style={styles.destination} numberOfLines={1}>
              {plan.destination}
            </Text>
          ) : null}
          <Text style={styles.dates}>{plan.dateRange}</Text>
          <Text style={styles.tagline}>Trip memories</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <View style={styles.thread} />
      <View style={styles.inner}>
        <Text style={styles.emoji}>🧵</Text>
        <Text style={styles.title}>Made with apna</Text>
        <Text style={styles.tagline}>Plan trips. Split costs. Keep memories.</Text>
        <View style={styles.footerDot} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: REEL_FRAME_WIDTH,
    height: REEL_FRAME_HEIGHT,
    backgroundColor: '#F3EEE4',
    borderRadius: 16,
    overflow: 'hidden',
  },
  thread: {
    position: 'absolute',
    left: 16,
    top: 20,
    bottom: 20,
    width: 2,
    backgroundColor: '#B0402F',
    opacity: 0.6,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 26,
    color: '#1C1A15',
    textAlign: 'center',
    lineHeight: 32,
  },
  destination: {
    fontFamily: 'Outfit-Medium',
    fontSize: 15,
    color: '#B0402F',
    marginTop: 8,
    textAlign: 'center',
  },
  dates: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: '#6E675A',
    marginTop: 8,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: '#6E675A',
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#B0402F',
    marginTop: 20,
  },
})
