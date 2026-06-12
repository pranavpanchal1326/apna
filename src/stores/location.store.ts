// src/stores/location.store.ts
// Zustand store for Location Sharing & Privacy Settings.
// Persists ephemeral session state to MMKV and user privacy settings to Firestore.

import { create } from 'zustand'
import { createMMKV } from 'react-native-mmkv'
import { useAuthStore } from './auth.store'
import type { GroupLocationVisibility } from '../lib/types/location.types'
import { LOCATION_SESSION_DURATION_MS } from '../lib/types/location.types'
import {
  fetchPrivacyPreferences,
  savePrivacyPreferences,
  updateMemberLocation,
} from '../lib/firebase/realtime'
import { captureError } from '../lib/sentry'

interface LocationStore {
  // ── State ─────────────────────────────────────────────────────────
  isSharing:         boolean
  isGhostMode:       boolean
  sessionStartTime:  number | null
  sessionExpiryTime: number | null
  activeGroupId:     string | null
  privacyPreferences: Record<string, GroupLocationVisibility> // key: groupId
  isBackgroundActive:    boolean
  backgroundStartedAt:   number | null
  backgroundRemainingMs: number

  // ── Actions ────────────────────────────────────────────────────────
  hydrate:                () => void
  startSession:           (groupId: string) => Promise<void>
  stopSession:            () => Promise<void>
  toggleGhostMode:        () => void
  checkExpiry:            () => void
  loadPrivacyPreferences: (groupId: string) => Promise<void>
  updateGroupVisibility:  (groupId: string, visibility: GroupLocationVisibility) => Promise<void>
  setBackgroundActive:    (active: boolean, startedAt?: number) => void
  setBackgroundRemainingMs: (ms: number) => void
}

// Scoped MMKV instance for location settings
const locationStorage = createMMKV({ id: 'apna-location' })

export const useLocationStore = create<LocationStore>((set, get) => ({
  isSharing:         false,
  isGhostMode:       false,
  sessionStartTime:  null,
  sessionExpiryTime: null,
  activeGroupId:     null,
  privacyPreferences: {},
  isBackgroundActive:    false,
  backgroundStartedAt:   null,
  backgroundRemainingMs: 0,

  // ── Hydrate ────────────────────────────────────────────────────────

  hydrate() {
    try {
      const active = locationStorage.getBoolean('location_session_active') ?? false
      const ghost = locationStorage.getBoolean('location_ghost_mode') ?? false
      const start = locationStorage.getNumber('location_session_start') || null
      const expiry = locationStorage.getNumber('location_session_expiry') || null
      const groupId = locationStorage.getString('location_session_groupId') || null
      const bgActive = locationStorage.getBoolean('location_bg_active') ?? false
      const bgStart = locationStorage.getNumber('location_bg_start') || null

      set({
        isSharing: active,
        isGhostMode: ghost,
        sessionStartTime: start,
        sessionExpiryTime: expiry,
        activeGroupId: groupId,
        isBackgroundActive: bgActive,
        backgroundStartedAt: bgStart,
        backgroundRemainingMs: bgStart ? Math.max(0, 4 * 60 * 60 * 1000 - (Date.now() - bgStart)) : 0,
      })

      // Immediate check if session expired while app was closed
      get().checkExpiry()
    } catch (err) {
      captureError(err as Error, { source: 'locationStore.hydrate' })
    }
  },

  // ── Start Session ──────────────────────────────────────────────────

  async startSession(groupId) {
    try {
      const startTime = Date.now()
      const expiryTime = startTime + LOCATION_SESSION_DURATION_MS

      // Set store
      set({
        isSharing: true,
        sessionStartTime: startTime,
        sessionExpiryTime: expiryTime,
        activeGroupId: groupId,
      })

      // Save to MMKV
      locationStorage.set('location_session_active', true)
      locationStorage.set('location_session_start', startTime)
      locationStorage.set('location_session_expiry', expiryTime)
      locationStorage.set('location_session_groupId', groupId)

      // Pre-load privacy preferences for this group
      await get().loadPrivacyPreferences(groupId)
    } catch (err) {
      captureError(err as Error, { source: 'locationStore.startSession', groupId })
      throw err
    }
  },

  // ── Stop Session ───────────────────────────────────────────────────

  async stopSession() {
    const groupId = get().activeGroupId
    const myUid = useAuthStore.getState().user?.uid

    // Reset store state
    set({
      isSharing: false,
      sessionStartTime: null,
      sessionExpiryTime: null,
      activeGroupId: null,
    })

    // Clear MMKV
    locationStorage.remove('location_session_active')
    locationStorage.remove('location_session_start')
    locationStorage.remove('location_session_expiry')
    locationStorage.remove('location_session_groupId')

    try {
      // Final write to RTDB to immediately hide pin from others
      if (groupId && myUid) {
        await updateMemberLocation(groupId, myUid, { lat: 0, lng: 0, accuracy: 0 }, false)
      }
    } catch (err) {
      captureError(err as Error, { source: 'locationStore.stopSession', groupId })
    }
  },

  // ── Toggle Ghost Mode ──────────────────────────────────────────────

  toggleGhostMode() {
    const nextVal = !get().isGhostMode
    set({ isGhostMode: nextVal })
    locationStorage.set('location_ghost_mode', nextVal)
  },

  // ── Check Expiry ───────────────────────────────────────────────────

  checkExpiry() {
    const isSharing = get().isSharing
    const expiry = get().sessionExpiryTime
    if (isSharing && expiry && Date.now() >= expiry) {
      console.info('[Location] Session expired. Stopping location updates.')
      get().stopSession()
    }
  },

  // ── Load Privacy Preferences ───────────────────────────────────────

  async loadPrivacyPreferences(groupId) {
    const myUid = useAuthStore.getState().user?.uid
    if (!myUid) return

    try {
      const prefs = await fetchPrivacyPreferences(myUid, groupId)
      if (prefs) {
        set((s) => ({
          privacyPreferences: {
            ...s.privacyPreferences,
            [groupId]: prefs,
          },
        }))
      } else {
        // Use defaults
        const defaultPrefs: GroupLocationVisibility = {
          shareWithAll: true,
          excludedMembers: [],
          updatedAt: null,
        }
        set((s) => ({
          privacyPreferences: {
            ...s.privacyPreferences,
            [groupId]: defaultPrefs,
          },
        }))
      }
    } catch (err) {
      captureError(err as Error, { source: 'locationStore.loadPrivacyPreferences', groupId })
    }
  },

  // ── Update Group Visibility ────────────────────────────────────────

  async updateGroupVisibility(groupId, visibility) {
    const myUid = useAuthStore.getState().user?.uid
    if (!myUid) return

    try {
      // Optimistic update
      set((s) => ({
        privacyPreferences: {
          ...s.privacyPreferences,
          [groupId]: visibility,
        },
      }))

      // Persist to Firestore
      await savePrivacyPreferences(myUid, groupId, visibility)
    } catch (err) {
      captureError(err as Error, { source: 'locationStore.updateGroupVisibility', groupId })
      // Re-load to revert
      await get().loadPrivacyPreferences(groupId)
      throw err
    }
  },

  setBackgroundActive(active, startedAt) {
    const start = startedAt ?? (active ? Date.now() : null)
    set({
      isBackgroundActive: active,
      backgroundStartedAt: start,
    })
    locationStorage.set('location_bg_active', active)
    if (start) {
      locationStorage.set('location_bg_start', start)
    } else {
      locationStorage.remove('location_bg_start')
    }
  },

  setBackgroundRemainingMs(ms) {
    set({ backgroundRemainingMs: ms })
  },
}))
