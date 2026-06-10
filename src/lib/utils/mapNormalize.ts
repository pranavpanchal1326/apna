// src/lib/utils/mapNormalize.ts
// Pure utility functions to parse and normalize Firestore and Realtime Database models for Mapbox presentation.

import type { ItineraryItem, UserInput } from '../schemas'
import type { LocationUpdate, MemberLocation } from '../types/location.types'
import { LOCATION_STATUS_THRESHOLDS } from '../types/location.types'

/**
 * Normalizes itinerary items into map-ready pins.
 * Filters out items without coordinates and sorts them chronologically if needed.
 */
export function normalizeItineraryPins(items: ItineraryItem[]): ItineraryItem[] {
  return items.filter(
    (item) => item.placeRef?.lat !== undefined && item.placeRef?.lng !== undefined
  )
}

/**
 * Normalizes member locations from raw RTDB snapshots.
 */
export function normalizeMemberLocations(
  locations: Record<string, LocationUpdate> | null,
  members: Map<string, UserInput>
): MemberLocation[] {
  if (!locations) return []
  const now = Date.now()

  return Object.entries(locations)
    .map(([userId, update]): MemberLocation | null => {
      const member = members.get(userId)
      if (!member || update.sharing === false) return null

      const diff = now - update.timestamp
      let status: 'live' | 'recent' | 'offline' = 'offline'

      if (diff <= LOCATION_STATUS_THRESHOLDS.live) {
        status = 'live'
      } else if (diff <= LOCATION_STATUS_THRESHOLDS.recent) {
        status = 'recent'
      }

      return {
        ...update,
        userId,
        name: member.name || 'Squad Member',
        avatarColor: member.avatarColor || '#4ECDC4',
        status,
      }
    })
    .filter((loc): loc is MemberLocation => loc !== null)
}

/**
 * Extracts coordinates for route polyline overlays, preserving itinerary sort order.
 */
export function buildRouteSegments(items: ItineraryItem[]): Array<[number, number]> {
  return items
    .filter((item) => item.isConfirmed && item.placeRef?.lat !== undefined && item.placeRef?.lng !== undefined)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => [item.placeRef!.lng, item.placeRef!.lat] as [number, number])
}

/**
 * Derives the next planned and uncompleted stop.
 */
export function deriveNextStop(items: ItineraryItem[], currentUserId: string): ItineraryItem | null {
  const confirmed = items
    .filter((item) => item.isConfirmed && item.placeRef?.lat !== undefined && item.placeRef?.lng !== undefined)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    confirmed.find((item) => {
      const hasCheckedIn = item.checkedInUids?.includes(currentUserId)
      const isCompleted = !!item.completedAt
      return !hasCheckedIn && !isCompleted
    }) || null
  )
}

/**
 * Calculates Haversine distance in kilometers between two lat/lng coordinates.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
