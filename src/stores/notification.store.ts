// src/stores/notification.store.ts
// FCM token state — tracks registration status across the app session.
// Persisted to MMKV so we don't re-register on every cold start.

import { create } from 'zustand'
import { createMMKV } from 'react-native-mmkv'

const notifStorage  = createMMKV({ id: 'apna-notifications' })
const FCM_TOKEN_KEY = 'fcm-token'
const FCM_GRANT_KEY = 'fcm-granted'

interface NotificationStore {
  token:         string | null
  isGranted:     boolean
  isRegistering: boolean

  setToken:       (token: string) => void
  setGranted:     (granted: boolean) => void
  setRegistering: (loading: boolean) => void
  getCachedToken: () => string | null
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  token:         notifStorage.getString(FCM_TOKEN_KEY) ?? null,
  isGranted:     notifStorage.getBoolean(FCM_GRANT_KEY) ?? false,
  isRegistering: false,

  setToken: (token) => {
    notifStorage.set(FCM_TOKEN_KEY, token)
    set({ token })
  },

  setGranted: (granted) => {
    notifStorage.set(FCM_GRANT_KEY, granted)
    set({ isGranted: granted })
  },

  setRegistering: (loading) => set({ isRegistering: loading }),

  getCachedToken: () => notifStorage.getString(FCM_TOKEN_KEY) ?? null,
}))
