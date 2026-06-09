// src/hooks/useFCM.ts
// FCM registration hook. Called once from App.tsx after auth.
// Silently registers, saves token to Firestore, updates store.
// Never interrupts the user flow — all errors are swallowed.

import { useEffect } from 'react'
import { useNotificationStore }          from '@stores/notification.store'
import { registerForPushNotifications, saveFCMToken } from '@lib/firebase/notifications'
import { captureError }                  from '@lib/sentry'

export function useFCM(uid: string | null): void {
  const { setToken, setGranted, setRegistering, getCachedToken } =
    useNotificationStore()

  useEffect(() => {
    // Only register when user is authenticated
    if (!uid) return

    // Skip if we already have a cached token for this session.
    // Token rotates rarely — re-register only on first auth or token expiry.
    const cached = getCachedToken()
    if (cached) {
      // Re-save to Firestore in case user reinstalled — ensure server has latest
      saveFCMToken(uid, cached).catch(() => {})
      return
    }

    let cancelled = false

    const register = async () => {
      setRegistering(true)
      try {
        const result = await registerForPushNotifications()
        if (cancelled || !result) return

        setGranted(result.granted)

        if (result.granted && result.token) {
          setToken(result.token)
          await saveFCMToken(uid, result.token)
        }
      } catch (err) {
        if (!cancelled) {
          captureError(err, { source: 'useFCM', uid })
          // Non-fatal — push notifications optional
        }
      } finally {
        if (!cancelled) setRegistering(false)
      }
    }

    register()

    return () => {
      cancelled = true
    }
  }, [uid])   // Re-run if uid changes (sign-out → sign-in as different user)
}
