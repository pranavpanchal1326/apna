// src/lib/notifications/handlers.ts
import * as Notifications from 'expo-notifications'
import { AppNotificationData } from './payloads'
import { notificationToDeepLink } from '@navigation/deeplink/notificationRouter'
import { track } from '@lib/analytics'
import { captureError } from '@lib/sentry'

export interface NotificationInitResult {
  unsubscribeForeground?: () => void
  unsubscribeOpened?: () => void
}

const processedNotificationIds = new Set<string>()

export async function getInitialNotificationLink(): Promise<string | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync()
    if (response) {
      const identifier = response.notification.request.identifier
      if (processedNotificationIds.has(identifier)) {
        return null
      }
      processedNotificationIds.add(identifier)

      const data = response.notification.request.content.data as AppNotificationData | undefined
      if (data && data.type && data.groupId) {
        track('notification_opened', { type: data.type, groupId: data.groupId })
        return notificationToDeepLink(data)
      }
    }
  } catch (err) {
    captureError(err, { source: 'getInitialNotificationLink' })
  }
  return null
}

export function registerNotificationHandlers(
  onOpenLink: (url: string) => void
): NotificationInitResult {
  // 1. Foreground listener
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as AppNotificationData | undefined
    if (data && data.type && data.groupId) {
      track('notification_received_foreground', { type: data.type, groupId: data.groupId })
    }
  })

  // 2. Opened / response listener
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const identifier = response.notification.request.identifier
    if (processedNotificationIds.has(identifier)) {
      return
    }
    processedNotificationIds.add(identifier)

    const data = response.notification.request.content.data as AppNotificationData | undefined
    if (data && data.type && data.groupId) {
      track('notification_opened', { type: data.type, groupId: data.groupId })

      if (data.type === 'expense_added' || data.type === 'expense_updated') {
        track('notification_opened_expense', { type: data.type, groupId: data.groupId })
      } else if (data.type === 'settlement_recorded') {
        track('notification_opened_settlement', { type: data.type, groupId: data.groupId })
      } else {
        track('notification_opened_group', { type: data.type, groupId: data.groupId })
      }

      const url = notificationToDeepLink(data)
      onOpenLink(url)
    }
  })

  return {
    unsubscribeForeground: () => foregroundSubscription.remove(),
    unsubscribeOpened: () => responseSubscription.remove(),
  }
}
