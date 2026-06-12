// src/navigation/deeplink/handler.ts
// Central deep link handler — translates a parsed deep link into a navigation action.
// Called from RootNavigator on both cold-start and warm-start URLs.
// Also called by the notification handler via Linking.openURL.
//
// Auth-gated routing:
//   - Protected routes when unauthenticated → setPendingNavigation + route to auth
//   - RootNavigator resumes pending navigation after auth completes

import type { NavigationContainerRef } from '@react-navigation/native'
import type { RootStackParamList } from '@navigation/types'
import { parseDeepLink, type ParsedDeepLink } from './parser'
import {
  setPendingNavigation,
  clearPendingNavigation,
  type PendingNavTarget,
} from './pendingNavigation'
import {
  trackDeepLinkOpened,
  trackDeepLinkFailed,
  trackDeepLinkAuthGated,
  trackDeepLinkResolved,
} from './analytics'
import { captureError } from '@lib/sentry'

// Public routes — no auth needed
const PUBLIC_LINK_TYPES = new Set(['recap', 'referral', 'unknown'])

type AuthStatus = 'authenticated' | 'unauthenticated' | 'needs_profile' | 'initializing'

interface HandleDeepLinkOptions {
  navigationRef: NavigationContainerRef<RootStackParamList>
  authStatus: AuthStatus
  /** 'cold_start' when app is launched from killed state, 'warm_start' otherwise */
  urlSource?: 'cold_start' | 'warm_start' | 'notification'
}

/**
 * Parse and route a raw URL.
 * Safe to call even if navigationRef is not yet ready — it will no-op.
 */
export function handleDeepLink(
  url: string,
  { navigationRef, authStatus, urlSource = 'warm_start' }: HandleDeepLinkOptions,
): void {
  if (!url) return

  const parsed = parseDeepLink(url)
  if (!parsed) return

  const isAuthenticated = authStatus === 'authenticated'
  const isPublic = PUBLIC_LINK_TYPES.has(parsed.type)

  trackDeepLinkOpened(parsed.type, parsed.type, urlSource)

  // Unauthenticated + protected → store for post-auth resume
  if (!isAuthenticated && !isPublic) {
    setPendingNavigation({
      type: parsed.type,
      params: parsed.params,
      raw_url: parsed.raw_url,
    })
    trackDeepLinkAuthGated(parsed.type)
    return
  }

  if (!navigationRef.isReady()) return

  routeParsedLink(parsed, navigationRef)
}

/**
 * Resume a pending navigation target after auth completes.
 * Call this from RootNavigator once authStatus transitions to 'authenticated'.
 */
export function resumePendingNavigation(
  target: PendingNavTarget,
  navigationRef: NavigationContainerRef<RootStackParamList>,
): void {
  if (!navigationRef.isReady()) return

  clearPendingNavigation()

  const parsed: ParsedDeepLink = {
    type: target.type as ParsedDeepLink['type'],
    params: target.params,
    raw_url: target.raw_url,
    parsed_at: Date.now(),
  }

  routeParsedLink(parsed, navigationRef)
}

/**
 * Core routing switch — translate a ParsedDeepLink to a navigation call.
 * All auth checks happen before this function is called.
 */
function routeParsedLink(
  parsed: ParsedDeepLink,
  navigationRef: NavigationContainerRef<RootStackParamList>,
): void {
  try {
    switch (parsed.type) {
      case 'group_invite':
        // Navigate into Home stack's JoinGroup with the code pre-filled
        navigationRef.navigate('Main', undefined as any)
        // Give navigator time to mount Main before pushing JoinGroup
        setTimeout(() => {
          navigationRef.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'JoinGroup',
              params: undefined,
            },
          } as any)
        }, 50)
        trackDeepLinkResolved(parsed.type, 'JoinGroup')
        break

      case 'group_direct':
        navigationRef.navigate('Main', {
          screen: 'HomeTab',
          params: {
            screen: 'GroupHome',
            params: { groupId: parsed.params.groupId, groupName: '' },
          },
        } as any)
        trackDeepLinkResolved(parsed.type, 'GroupHome')
        break

      case 'expense':
        navigationRef.navigate('Main', {
          screen: 'HomeTab',
          params: {
            screen: 'ExpenseDetail',
            params: { groupId: parsed.params.groupId, expenseId: parsed.params.expenseId },
          },
        } as any)
        trackDeepLinkResolved(parsed.type, 'ExpenseDetail')
        break

      case 'group_settings':
        navigationRef.navigate('Main', {
          screen: 'HomeTab',
          params: {
            screen: 'GroupSettings',
            params: { groupId: parsed.params.groupId },
          },
        } as any)
        trackDeepLinkResolved(parsed.type, 'GroupSettings')
        break

      case 'group_members':
        navigationRef.navigate('Main', {
          screen: 'HomeTab',
          params: {
            screen: 'GroupMembersManage',
            params: { groupId: parsed.params.groupId },
          },
        } as any)
        trackDeepLinkResolved(parsed.type, 'GroupMembersManage')
        break

      case 'memory_detail':
        navigationRef.navigate('Main', {
          screen: 'Memories',
          params: {
            screen: 'MemoryDetail',
            params: { groupId: parsed.params.groupId, memoryId: parsed.params.memoryId },
          },
        } as any)
        trackDeepLinkResolved(parsed.type, 'MemoryDetail')
        break

      case 'on_this_day':
        navigationRef.navigate('Main', {
          screen: 'Memories',
          params: {
            screen: 'OnThisDay',
            params: { groupId: parsed.params.groupId },
          },
        } as any)
        trackDeepLinkResolved(parsed.type, 'OnThisDay')
        break

      case 'recap':
        navigationRef.navigate('PublicRecap', { slug: parsed.params.slug })
        trackDeepLinkResolved(parsed.type, 'PublicRecap')
        break

      case 'referral':
        // Referral links are handled by initReferralCapture in App.tsx.
        // RootNavigator does nothing extra here — just land on Home.
        navigationRef.navigate('Main', undefined as any)
        trackDeepLinkResolved(parsed.type, 'HomeList')
        break

      case 'unknown':
      default:
        // Unknown route — go Home with a toast via the error handler
        navigationRef.navigate('Main', undefined as any)
        trackDeepLinkFailed(parsed.type, 'unknown', 'unknown_route')
        break
    }
  } catch (err) {
    captureError(err, { source: 'routeParsedLink', url: parsed.raw_url, type: parsed.type })
    trackDeepLinkFailed(parsed.type, 'unknown', 'navigation_error')
  }
}

/**
 * Pending navigation storage — exported from handler for convenience.
 * Consumers (AuthNavigator, RootNavigator) import from here.
 */
export {
  setPendingNavigation,
  getPendingNavigation,
  clearPendingNavigation,
  hasPendingNavigation,
} from './pendingNavigation'
