// src/hooks/useNotifications.ts
import { useEffect, useState } from 'react'
import { Linking } from 'react-native'
import { useAuthStore } from '@stores/auth.store'
import { useNotificationStore } from '@stores/notification.store'
import {
  NotificationPermissionState,
  getNotificationPermissionState,
  registerPushToken,
  syncPushTokenIfNeeded,
  registerNotificationHandlers,
  getInitialNotificationLink,
} from '@lib/notifications'
import { track } from '@lib/analytics'
import { captureError } from '@lib/sentry'

export function useNotifications() {
  const user = useAuthStore((s) => s.user)
  const uid = user?.uid ?? null
  const { setToken, setGranted, setRegistering, token } = useNotificationStore()
  const [permission, setPermission] = useState<NotificationPermissionState | null>(null)

  useEffect(() => {
    // Sync permission state on hook mount
    getNotificationPermissionState().then((state) => {
      setPermission(state)
      setGranted(state.granted)
    })
  }, [setGranted])

  // Sync / register token when user logs in
  useEffect(() => {
    if (!uid) return

    const initNotifications = async () => {
      setRegistering(true)
      try {
        const currentToken = token

        if (!currentToken) {
          track('notifications_permission_requested', {})
          const regToken = await registerPushToken(uid)
          if (regToken) {
            setToken(regToken)
            setGranted(true)
            track('notifications_permission_granted', {})
            track('notifications_token_registered', {})
          } else {
            track('notifications_permission_denied', {})
          }
        } else {
          // Verify and sync if changed
          const syncedToken = await syncPushTokenIfNeeded(uid)
          if (syncedToken) {
            setToken(syncedToken)
            setGranted(true)
          }
        }
      } catch (err) {
        captureError(err, { source: 'useNotifications_init', uid })
      } finally {
        setRegistering(false)
      }
    }

    initNotifications()
  }, [uid, token, setToken, setGranted, setRegistering])

  // Register foreground/background tap listeners
  useEffect(() => {
    if (!uid) return

    // Setup tap handlers
    const handlers = registerNotificationHandlers((url) => {
      Linking.openURL(url).catch((err) => {
        captureError(err, { source: 'useNotifications_openURL', url })
      })
    })

    // Handle cold start/quit state notification
    getInitialNotificationLink().then((url) => {
      if (url) {
        Linking.openURL(url).catch((err) => {
          captureError(err, { source: 'useNotifications_coldStartURL', url })
        })
      }
    })

    return () => {
      handlers.unsubscribeForeground?.()
      handlers.unsubscribeOpened?.()
    }
  }, [uid])

  const enable = async () => {
    if (!uid) return
    setRegistering(true)
    try {
      track('notifications_permission_requested', {})
      const regToken = await registerPushToken(uid)
      if (regToken) {
        setToken(regToken)
        setGranted(true)
        track('notifications_permission_granted', {})
        track('notifications_token_registered', {})
      } else {
        track('notifications_permission_denied', {})
      }
      const state = await getNotificationPermissionState()
      setPermission(state)
    } catch (err) {
      captureError(err, { source: 'useNotifications_enable', uid })
    } finally {
      setRegistering(false)
    }
  }

  return {
    isEnabled: !!token,
    permission,
    enable,
  }
}
