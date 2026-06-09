// src/lib/notifications/permissions.ts
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'

export interface NotificationPermissionState {
  granted: boolean
  canAskAgain: boolean
  status: 'granted' | 'denied' | 'undetermined'
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (!Device.isDevice) {
    return { granted: false, canAskAgain: false, status: 'denied' }
  }
  try {
    const { status, canAskAgain, granted } = await Notifications.getPermissionsAsync()
    return {
      granted,
      canAskAgain,
      status: status as 'granted' | 'denied' | 'undetermined',
    }
  } catch (err) {
    return { granted: false, canAskAgain: false, status: 'undetermined' }
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!Device.isDevice) {
    return { granted: false, canAskAgain: false, status: 'denied' }
  }
  try {
    const { status, canAskAgain, granted } = await Notifications.requestPermissionsAsync()
    return {
      granted,
      canAskAgain,
      status: status as 'granted' | 'denied' | 'undetermined',
    }
  } catch (err) {
    return { granted: false, canAskAgain: false, status: 'undetermined' }
  }
}
