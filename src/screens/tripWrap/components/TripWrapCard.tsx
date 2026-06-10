// src/screens/tripWrap/components/TripWrapCard.tsx
import { StyleSheet, View, Text, Image } from 'react-native'
import type { TripWrapBundle } from '../../../lib/utils/tripWrapData'
import { useTheme } from '@theme'

interface TripWrapCardProps {
  data: TripWrapBundle
}

export function TripWrapCard({ data }: TripWrapCardProps) {
  const { colors, text, spacing, radius } = useTheme()

  // Extract up to 4 photos from the top memories
  const photos = data.topMemories
    .map((m) => m.photoUrl)
    .filter((url): url is string => typeof url === 'string')
    .slice(0, 4)

  return (
    <View style={[styles.card, { backgroundColor: '#121212', borderRadius: radius.lg, padding: spacing.xl }]}>
      {/* Header Info */}
      <View style={styles.header}>
        <Text style={styles.emoji}>{data.topMemories[0]?.caption?.slice(0, 2) || '✈️'}</Text>
        <Text style={[text.heading.md, { color: '#FFFFFF', textAlign: 'center', marginBottom: 4 }]} numberOfLines={1}>
          {data.groupName}
        </Text>
        <Text style={[text.body.sm, { color: '#A0A0A0', textAlign: 'center' }]}>
          {data.dateRange}
        </Text>
      </View>

      {/* Grid of Images */}
      {photos.length > 0 ? (
        <View style={[styles.grid, { gap: spacing.md }]}>
          {photos.map((photo, index) => (
            <Image
              key={photo}
              source={{ uri: photo }}
              style={[
                styles.gridImage,
                {
                  borderRadius: radius.md,
                  // If odd number of photos and it's the last one, span full width
                  width: photos.length === 3 && index === 2 ? '100%' : '47%',
                },
              ]}
              resizeMode="cover"
            />
          ))}
          {/* If less than 4 photos, pad out with a beautiful card showing a stat */}
          {photos.length < 4 && (
            <View style={[styles.gridPlaceholder, { borderRadius: radius.md, backgroundColor: '#1E1E1E', gap: spacing.xs }]}>
              <Text style={{ fontSize: 24 }}>🎒</Text>
              <Text style={[text.label.md, { color: colors.accentPrimary }]}>{data.memberCount} Members</Text>
              <Text style={[text.body.sm, { color: '#888' }]}>One epic adventure</Text>
            </View>
          )}
        </View>
      ) : (
        // Completely text/stats based placeholder if no photos exist
        <View style={[styles.noPhotosContainer, { borderRadius: radius.md, backgroundColor: '#1E1E1E', padding: spacing.lg }]}>
          <Text style={{ fontSize: 48, marginBottom: spacing.md }}>🌅</Text>
          <Text style={[text.heading.sm, { color: '#FFFFFF', textAlign: 'center', marginBottom: spacing.xs }]}>
            No photos captured
          </Text>
          <Text style={[text.body.sm, { color: '#888', textAlign: 'center' }]}>
            But the memories and balance sheets will last forever!
          </Text>
        </View>
      )}

      {/* Key Stats Row */}
      <View style={styles.statsContainer}>
        <View style={styles.statColumn}>
          <Text style={[text.heading.sm, { color: colors.accentPrimary }]}>
            {data.currency === 'INR' ? '₹' : ''}
            {data.totalSpend.toLocaleString('en-IN')}
          </Text>
          <Text style={[text.body.sm, { color: '#A0A0A0' }]}>Total Spent</Text>
        </View>
        <View style={styles.statColumn}>
          <Text style={[text.heading.sm, { color: '#FFFFFF' }]}>{data.tripDays}</Text>
          <Text style={[text.body.sm, { color: '#A0A0A0' }]}>Days</Text>
        </View>
        <View style={styles.statColumn}>
          <Text style={[text.heading.sm, { color: '#FFFFFF' }]}>{data.placesVisitedCount}</Text>
          <Text style={[text.body.sm, { color: '#A0A0A0' }]}>Places</Text>
        </View>
        {data.distanceTraveled > 0 && (
          <View style={styles.statColumn}>
            <Text style={[text.heading.sm, { color: '#FFFFFF' }]}>{data.distanceTraveled} km</Text>
            <Text style={[text.body.sm, { color: '#A0A0A0' }]}>Traveled</Text>
          </View>
        )}
      </View>

      {/* Watermark Footer */}
      <View style={styles.footer}>
        <Text style={[text.body.sm, { color: '#555555', letterSpacing: 2 }]}>
          apna · TRIP RECAP
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: 350,
    height: 580,
    justifyContent: 'space-between',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    height: 280,
    width: '100%',
  },
  gridImage: {
    height: 130,
  },
  gridPlaceholder: {
    width: '47%',
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  noPhotosContainer: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#222',
  },
  statColumn: {
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
  },
})
