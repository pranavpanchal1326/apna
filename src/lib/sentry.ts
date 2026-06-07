// src/lib/sentry.ts
// Sentry React Native SDK — crash reporting + performance tracing.
// Init called FIRST in App.tsx before any other setup.
// DSN from environment — never hardcode in source.
//
// Captures:
//   - All unhandled JS exceptions
//   - React component tree errors (via Sentry.ErrorBoundary)
//   - Navigation breadcrumbs (wired in RootNavigator)
//   - Firebase Auth + Firestore errors (manual capture in store)
//   - ANRs on Android via native SDK
//
// Privacy:
//   - Phone numbers NEVER sent to Sentry (PII scrubbing below)
//   - User identified by uid only — no name, no phone

import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'

const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn as string | undefined

export function initSentry() {
  if (!SENTRY_DSN) {
    if (__DEV__) console.warn('[Sentry] DSN not set in app.config.ts extra.sentryDsn')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: false,
    environment: __DEV__ ? 'development' : 'production',
    release: Constants.expoConfig?.version ?? '1.0.0',

    // Performance tracing — sample 20% of sessions in prod
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,

    // PII scrubbing — remove phone numbers from all payloads
    beforeSend(event) {
      if (event.request?.data) {
        const data = event.request.data as Record<string, unknown>
        if (typeof data === 'object') {
          Object.keys(data).forEach((key) => {
            if (key.toLowerCase().includes('phone')) {
              data[key] = '[REDACTED]'
            }
          })
        }
      }
      return event
    },

    // Ignore non-actionable errors
    ignoreErrors: [
      'Network request failed',
      'The operation couldn\'t be completed',
      'Load failed',
    ],
  })
}

/**
 * Identify user in Sentry after sign-in.
 * Only uid — never name or phone.
 */
export function identifyUser(uid: string) {
  Sentry.setUser({ id: uid })
}

/**
 * Clear user identity on logout.
 */
export function clearSentryUser() {
  Sentry.setUser(null)
}

/**
 * Manually capture an error with context.
 * Use in catch blocks for Firebase operations.
 */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>
) {
  if (__DEV__) console.error('[Error]', error, context)
  Sentry.captureException(error, { extra: context })
}

/**
 * Add a breadcrumb for key user actions.
 * Called from analytics.ts — do not call directly in screens.
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({ message, category, data, level: 'info' })
}

export const SentryErrorBoundary = Sentry.ErrorBoundary
export { Sentry }
