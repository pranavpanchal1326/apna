// src/lib/notifications/token.ts
import { updateDoc } from 'firebase/firestore'
import { userDoc } from '@lib/firebase/collections'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { captureError } from '@lib/sentry'
import { getNotificationPermissionState, requestNotificationPermission } from './permissions'

export async function getDevicePushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null
  }
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId

    if (!projectId) {
      if (__DEV__) console.warn('[FCM] No projectId found in Constants')
      return null
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
    return tokenData.data
  } catch (err) {
    captureError(err, { source: 'getDevicePushToken' })
    return null
  }
}

export async function registerPushToken(uid: string): Promise<string | null> {
  try {
    const permission = await requestNotificationPermission()
    if (!permission.granted) {
      return null
    }

    const token = await getDevicePushToken()
    if (!token) return null

    // Write to user doc
    await updateDoc(userDoc(uid), {
      fcmToken: token,
      fcmTokenUpdatedAt: new Date().toISOString(),
    } as any)

    return token
  } catch (err) {
    captureError(err, { source: 'registerPushToken', uid })
    return null
  }
}

export async function removePushToken(uid: string): Promise<void> {
  try {
    await updateDoc(userDoc(uid), {
      fcmToken: null,
      fcmTokenUpdatedAt: new Date().toISOString(),
    } as any)
  } catch (err) {
    captureError(err, { source: 'removePushToken', uid })
  }
}

export async function syncPushTokenIfNeeded(uid: string): Promise<string | null> {
  try {
    const permission = await getNotificationPermissionState()
    if (!permission.granted) {
      return null
    }

    const token = await getDevicePushToken()
    if (!token) return null

    // Update the token on Firestore
    await updateDoc(userDoc(uid), {
      fcmToken: token,
      fcmTokenUpdatedAt: new Date().toISOString(),
    } as any)

    return token
  } catch (err) {
    captureError(err, { source: 'syncPushTokenIfNeeded', uid })
    return null
  }
}
