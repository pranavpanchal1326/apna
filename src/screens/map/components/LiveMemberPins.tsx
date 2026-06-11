// src/screens/map/components/LiveMemberPins.tsx
// Mapbox PointAnnotations for each live group member sharing location.

import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import MapboxGL from '@rnmapbox/maps'
import { useTheme } from '../../../theme'
import type { MemberLocation } from '../../../lib/types/location.types'

interface LiveMemberPinsProps {
  locations: MemberLocation[]
  activeMemberId: string | null
  onPressMember: (loc: MemberLocation) => void
}

const AVATAR_SIZE = 32

export const LiveMemberPins = memo(function LiveMemberPins({
  locations,
  activeMemberId,
  onPressMember,
}: LiveMemberPinsProps) {
  const { colors, radius, text, shadows } = useTheme()

  return (
    <>
      {locations.map((loc) => {
        const coordinate: [number, number] = [loc.lng, loc.lat]
        const isActive = activeMemberId === loc.userId

        const isGhostPin = loc.sharing === false

        // Determine border color based on status
        let statusColor: string = colors.border
        if (isGhostPin) {
          statusColor = colors.accentPrimary
        } else if (loc.status === 'live') {
          statusColor = colors.positive
        } else if (loc.status === 'recent') {
          statusColor = colors.warning
        } else if (loc.status === 'offline') {
          statusColor = colors.settled
        }

        return (
          <MapboxGL.PointAnnotation
            key={loc.userId}
            id={`live-member-${loc.userId}`}
            coordinate={coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            onSelected={() => onPressMember(loc)}
          >
            <View style={styles.pinWrapper}>
              <View
                style={[
                  styles.avatarCircle,
                  {
                    width: AVATAR_SIZE,
                    height: AVATAR_SIZE,
                    borderRadius: radius.full,
                    backgroundColor: loc.avatarColor,
                    borderColor: statusColor,
                    borderWidth: isActive ? 2.5 : 1.5,
                    borderStyle: isGhostPin ? 'dashed' : 'solid',
                    opacity: isGhostPin ? 0.6 : 1,
                  },
                  isActive && shadows.accentGlow,
                ]}
              >
                <Text style={[text.label.sm, styles.initialText]}>
                  {isGhostPin ? '👻' : loc.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              {/* Proximity / Live Pulse effect */}
              {loc.status === 'live' && (
                <View
                  style={[
                    styles.livePulse,
                    {
                      borderColor: colors.positive,
                      borderRadius: (AVATAR_SIZE + 6) / 2,
                    },
                  ]}
                />
              )}
            </View>
          </MapboxGL.PointAnnotation>
        )
      })}
    </>
  )
})

const styles = StyleSheet.create({
  pinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: AVATAR_SIZE + 8,
    height: AVATAR_SIZE + 8,
  },
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  initialText: {
    color: '#080C14',
    fontWeight: '700',
  },
  livePulse: {
    position: 'absolute',
    top: 1,
    left: 1,
    width: AVATAR_SIZE + 6,
    height: AVATAR_SIZE + 6,
    borderWidth: 1,
    opacity: 0.6,
  },
})
