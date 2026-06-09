// src/lib/firebase/notifications.ts
// FCM token registration and local notification helpers.
// Called from useFCM hook — never from screens directly.
//
// FCM on Expo Managed workflow:
//   - expo-notifications handles local + push notification display
//   - expo-device required to check if running on real device
//   - For Expo Managed: use getExpoPushTokenAsync (expo-notifications)
//
// Install (run once, after this prompt):
//   npx expo install expo-notifications expo-device

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { updateDoc, doc } from 'firebase/firestore'
import { db } from './config'
import { captureError } from '@lib/sentry'
import Constants from 'expo-constants'

// Configure how notifications display when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  } as any),
})

export interface FCMRegistrationResult {
  token:   string
  granted: boolean
}

// ── Request permission + get Expo push token ──────────────────────────────────
// Returns null if on simulator or permission denied.
// Never throws — all errors are captured silently.
export async function registerForPushNotifications(): Promise<FCMRegistrationResult | null> {
  // FCM only works on real devices
  if (!Device.isDevice) {
    if (__DEV__) console.log('[FCM] Skipped — not a real device')
    return null
  }

  try {
    // Check existing permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    // Only request if not already determined
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      return { token: '', granted: false }
    }

    // Get Expo push token (works with FCM under the hood for Android)
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
    const token     = tokenData.data

    return { token, granted: true }
  } catch (err) {
    captureError(err, { source: 'registerForPushNotifications' })
    return null
  }
}

// ── Save FCM/Expo push token to Firestore user document ──────────────────────
// Stored on user doc for Cloud Function to read when sending pushes.
export async function saveFCMToken(uid: string, token: string): Promise<void> {
  if (!token) return
  try {
    await updateDoc(doc(db, 'users', uid), {
      fcmToken:          token,
      fcmTokenUpdatedAt: new Date().toISOString(),
    })
  } catch (err) {
    captureError(err, { source: 'saveFCMToken', uid })
    // Non-fatal — app works without FCM
  }
}

// ── Schedule a local notification ────────────────────────────────────────────
// Phase 5 stub — trip countdown reminders etc.
export async function scheduleLocalNotification(
  title:   string,
  body:    string,
  trigger: Notifications.NotificationTriggerInput,
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
    },
    trigger,
  })
}

// ── Cancel all scheduled notifications ───────────────────────────────────────
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

// ── Add notification response listener ───────────────────────────────────────
// Use in App.tsx to handle deep links from notification taps.
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(handler)
}
