// src/navigation/deeplink/analytics.ts
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { createMMKV } from 'react-native-mmkv'
import * as Crypto from 'expo-crypto'
import { track } from '@lib/analytics'
import type { DeepLinkType } from './parser'

const storage = createMMKV({ id: 'apna-deeplink-analytics' })
const DEVICE_ID_KEY = 'anonymous-device-id'

function getAnonymousDeviceId(): string {
  let id = storage.getString(DEVICE_ID_KEY)
  if (!id) {
    try {
      id = Crypto.randomUUID()
    } catch {
      // Fallback in case of crypto failure in environments/tests
      id = 'dev-' + Math.random().toString(36).substring(2, 15)
    }
    storage.set(DEVICE_ID_KEY, id)
  }
  return id
}

const sharedProps = () => ({
  platform: Platform.OS,
  app_version: Constants.expoConfig?.version ?? '1.0.0',
  device_id: getAnonymousDeviceId(),
})

export function trackDeepLinkOpened(
  type: DeepLinkType,
  screenTarget: string,
  urlSource: 'cold_start' | 'warm_start' | 'notification',
) {
  track('deep_link_opened', {
    link_type: type,
    screen_target: screenTarget,
    url_source: urlSource,
    ...sharedProps(),
  })
}

export function trackDeepLinkFailed(
  type: DeepLinkType,
  screenTarget: string,
  errorType: string,
  urlSource: 'cold_start' | 'warm_start' | 'notification' = 'warm_start',
) {
  track('deep_link_error', {
    link_type: type,
    screen_target: screenTarget,
    error_type: errorType,
    url_source: urlSource,
    ...sharedProps(),
  })
}

export function trackDeepLinkAuthGated(type: DeepLinkType) {
  track('deep_link_auth_gated', {
    link_type: type,
    ...sharedProps(),
  })
}

export function trackDeepLinkResolved(type: DeepLinkType, screenTarget: string) {
  track('deep_link_resolved', {
    link_type: type,
    screen_target: screenTarget,
    ...sharedProps(),
  })
}

export function trackNotificationOpened(notificationType: string, groupId: string) {
  track('notification_link_opened', {
    notification_type: notificationType,
    groupId,
    ...sharedProps(),
  })
}

export function trackGroupJoinStarted(inviteCode: string, groupId: string, groupName: string) {
  track('group_join_started', {
    invite_code: inviteCode,
    groupId,
    group_name: groupName,
    ...sharedProps(),
  })
}
