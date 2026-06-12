// src/components/recap/PublicRecapCard.tsx
// Mobile-first shareable recap card — sanitized, screenshot-friendly.

import { StyleSheet, View, Text, Image } from 'react-native'
import type { PublicRecap } from '@lib/schemas/publicRecap.schema'

export const PUBLIC_RECAP_CARD_WIDTH = 360
export const PUBLIC_RECAP_CARD_HEIGHT = 640

interface PublicRecapCardProps {
  recap: PublicRecap
}

export function PublicRecapCard({ recap }: PublicRecapCardProps) {
  const photos = recap.topPhotos.slice(0, 4)
  const spendLabel =
    recap.includeSpend && recap.totalSpend
      ? `${recap.currency === 'INR' ? '₹' : ''}${recap.totalSpend.toLocaleString('en-IN')}`
      : null

  return (
    <View style={styles.card}>
      {/* Dhaga thread accent */}
      <View style={styles.threadLine} />

      <View style={styles.inner}>
        <Text style={styles.emoji}>{recap.coverEmoji || '✈️'}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {recap.tripName}
        </Text>
        {recap.destination ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {recap.destination}
          </Text>
        ) : null}
        <Text style={styles.dates}>{recap.dateRangeLabel}</Text>

        {photos.length > 0 ? (
          <View style={styles.grid}>
            {photos.map((photo, index) => (
              <Image
                key={`${photo}-${index}`}
                source={{ uri: photo }}
                style={[
                  styles.gridImage,
                  photos.length === 3 && index === 2 ? styles.gridImageWide : null,
                ]}
                resizeMode="cover"
              />
            ))}
            {photos.length < 4 ? (
              <View style={[styles.gridPlaceholder, photos.length === 3 ? styles.gridImageWide : null]}>
                <Text style={styles.placeholderEmoji}>🧵</Text>
                <Text style={styles.placeholderText}>{recap.memberCount} friends</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.heroFallback}>
            <Text style={styles.heroFallbackEmoji}>{recap.coverEmoji || '🌅'}</Text>
            <Text style={styles.heroFallbackText}>{recap.tagline}</Text>
          </View>
        )}

        <View style={styles.metricsRow}>
          <Metric value={String(recap.daysCount)} label="Days" />
          <Metric value={String(recap.memoriesCount)} label="Memories" />
          <Metric value={String(recap.placesCount)} label="Places" />
          {spendLabel ? <Metric value={spendLabel} label="Spent" accent /> : null}
        </View>

        {recap.tagline ? (
          <Text style={styles.tagline} numberOfLines={2}>
            {recap.tagline}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.footerDot} />
          <Text style={styles.footerText}>apna · trip recap</Text>
        </View>
      </View>
    </View>
  )
}

function Metric({
  value,
  label,
  accent = false,
}: {
  value: string
  label: string
  accent?: boolean
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, accent && styles.metricAccent]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: PUBLIC_RECAP_CARD_WIDTH,
    height: PUBLIC_RECAP_CARD_HEIGHT,
    backgroundColor: '#080C14',
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  threadLine: {
    position: 'absolute',
    left: 18,
    top: 24,
    bottom: 24,
    width: 2,
    backgroundColor: '#4ECDC4',
    opacity: 0.55,
    borderRadius: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 24,
    justifyContent: 'space-between',
  },
  emoji: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 24,
    color: '#F0F4FF',
    textAlign: 'center',
    lineHeight: 30,
  },
  subtitle: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    color: '#4ECDC4',
    textAlign: 'center',
    marginTop: 4,
  },
  dates: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: '#8A94B0',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    minHeight: 220,
  },
  gridImage: {
    width: '47%',
    height: 104,
    borderRadius: 12,
    backgroundColor: '#121826',
  },
  gridImageWide: {
    width: '100%',
  },
  gridPlaceholder: {
    width: '47%',
    height: 104,
    borderRadius: 12,
    backgroundColor: '#121826',
    borderWidth: 1,
    borderColor: '#243049',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  placeholderText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: '#8A94B0',
  },
  heroFallback: {
    minHeight: 220,
    borderRadius: 16,
    backgroundColor: '#121826',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  heroFallbackEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroFallbackText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: '#C5CBDB',
    textAlign: 'center',
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1C2438',
    paddingVertical: 12,
    marginTop: 8,
  },
  metric: {
    alignItems: 'center',
    minWidth: 56,
  },
  metricValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#F0F4FF',
  },
  metricAccent: {
    color: '#4ECDC4',
  },
  metricLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 10,
    color: '#8A94B0',
    marginTop: 2,
  },
  tagline: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: '#8A94B0',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4ECDC4',
    marginBottom: 6,
  },
  footerText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 10,
    color: '#5C667D',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
})
