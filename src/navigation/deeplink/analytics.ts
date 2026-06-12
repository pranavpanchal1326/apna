// src/navigation/deeplink/analytics.ts
// Deep link event tracking — all events funnel through track() from @lib/analytics.
// Never call PostHog/analytics directly from screens or link handlers.

import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { track } from '@lib/analytics'
import type { DeepLinkType } from './parser'

const sharedProps = () => ({
  platform: Platform.OS,
  app_version: Constants.expoConfig?.version ?? '1.0.0',
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
) {
  track('deep_link_error', {
    link_type: type,
    screen_target: screenTarget,
    error_type: errorType,
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
