// src/lib/analytics.ts
// PostHog analytics — event tracking + feature flags.
// All user-facing events in the app go through track() from this file.
// Screens never import PostHog directly.
//
// Event naming convention: OBJECT_ACTION (snake_case)
//   Good: 'expense_added', 'group_created', 'otp_sent'
//   Bad: 'addExpense', 'GroupCreate', 'sendOTP'
//
// Memory reel funnel (Prompt 4.4):
//   memory_reel_created, memory_reel_export_started, memory_reel_export_progress,
//   memory_reel_export_completed, memory_reel_export_failed, memory_reel_shared,
//   memory_reel_cancelled
//
// Trip recap funnel (Prompt 4.3):
//   trip_recap_created, trip_recap_rendered, trip_recap_shared,
//   trip_recap_share_sheet_opened, trip_recap_public_link_opened,
//   trip_recap_public_viewed, trip_recap_export_failed
//
// Referral funnel (Prompt 4.2):
//   referral_link_created, referral_link_shared, referral_link_opened,
//   referral_attribution_captured, referral_signup_completed, referral_group_joined,
//   referral_qualified, referral_reward_granted, referral_reward_rejected
//
// Privacy: phone numbers NEVER tracked. uid only.

import PostHog from 'posthog-react-native'
import Constants from 'expo-constants'
import { addBreadcrumb } from './sentry'

const POSTHOG_API_KEY = Constants.expoConfig?.extra?.postHogKey as string | undefined
const POSTHOG_HOST = 'https://app.posthog.com'

let client: PostHog | null = null

export function initAnalytics(): PostHog | null {
  if (!POSTHOG_API_KEY) {
    if (__DEV__) console.warn('[PostHog] API key not set in app.config.ts extra.postHogKey')
    return null
  }

  client = new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST,
    // Disable in dev — events go nowhere, but no noise in production
    disabled: __DEV__,
    // Capture page views automatically via navigation integration
    captureAppLifecycleEvents: true,
  })

  return client
}

/**
 * Identify user after sign-in.
 * Merges uid with non-PII properties.
 */
export function identifyAnalyticsUser(uid: string) {
  client?.identify(uid, {
    // Add non-PII cohort properties here as the app grows
    // e.g. onboarding_completed: true
  })
}

export function resetAnalyticsUser() {
  client?.reset()
}

/**
 * Track an event.
 * Always call this for key user actions — never call PostHog directly in screens.
 *
 * @example
 * track('expense_added', { category: 'food', amount: 850, split_type: 'equal' })
 * track('group_created', { member_count: 4 })
 * track('otp_sent')
 */
export function track(
  event: string,
  properties?: Record<string, string | number | boolean>
) {
  // Also add as Sentry breadcrumb for crash context
  addBreadcrumb(event, 'user_action', properties)
  client?.capture(event, properties)
}

/**
 * Screen view tracking — called from navigation state change listener.
 */
export function trackScreen(screenName: string) {
  client?.screen(screenName)
  addBreadcrumb(`Screen: ${screenName}`, 'navigation')
}

export function getAnalyticsClient() {
  return client
}
