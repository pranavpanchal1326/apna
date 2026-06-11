// =============================================================================
// Location types — Realtime Database ONLY (NOT Firestore)
//
// RTDB path: /groups/{groupId}/locations/{userId}
//
// Reasons for RTDB instead of Firestore:
//   - Sub-second update latency (location changes every 15s)
//   - Cheaper for high-frequency writes
//   - Auto-deleted after 4 hours via Cloud Function
//   - onDisconnect() can auto-clear on app kill
// =============================================================================

export interface LocationUpdate {
  lat: number       // Latitude — WGS84
  lng: number       // Longitude — WGS84
  accuracy: number  // GPS accuracy radius in metres (e.g. 10 = ±10m)
  timestamp: number // Unix milliseconds — used to determine status (live/recent/offline)
  sharing: boolean  // false = Ghost Mode: location hidden from all other members
}

// Client-side computed type — combines RTDB data with user profile for map rendering
export interface MemberLocation extends LocationUpdate {
  userId: string
  name: string
  avatarColor: string
  status: 'live' | 'recent' | 'offline'
  // Status rules:
  //   live    → timestamp within last 30 seconds
  //   recent  → timestamp 30s–5min ago
  //   offline → timestamp > 5 minutes ago OR sharing === false
}

// How often the device pushes a location update to RTDB
export const LOCATION_UPDATE_INTERVAL_MS = 15_000 // 15 seconds

// Thresholds for computing MemberLocation.status
export const LOCATION_STATUS_THRESHOLDS = {
  live:   30_000,  // 30 seconds in milliseconds
  recent: 300_000, // 5 minutes in milliseconds
} as const

import type { Timestamp } from 'firebase/firestore'

export interface LocationPrivacyPreferences {
  userId: string
  groupVisibility: Record<string, GroupLocationVisibility>
}

export interface GroupLocationVisibility {
  shareWithAll: boolean
  excludedMembers: string[]
  updatedAt: Timestamp | null
}

export interface LocationSession {
  isActive: boolean
  isGhostMode: boolean
  startTime: number | null      // Unix ms
  expiryTime: number | null     // Unix ms
  groupId: string | null
}

export const LOCATION_SESSION_DURATION_MS = 4 * 60 * 60 * 1000  // 4 hours
export const LOCATION_EXPIRY_WARNING_MS   = 5 * 60 * 1000        // 5 min warning
export const SOS_LOCATION_TTL_MS          = 60 * 60 * 1000       // SOS data lives 1 hour

