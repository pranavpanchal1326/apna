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
import { parseDeepLink } from './parser'
import { resolveRoute, type ResolvedRoute } from './resolver'
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
import { validateGroupInvite } from './inviteHandler'
import { useGroupStore } from '@stores/group.store'
import { useUIStore } from '@stores/ui.store'
import { useAuthStore } from '@stores/auth.store'
import { getDoc } from 'firebase/firestore'
import { groupDoc, expenseDoc, memoryDoc } from '@lib/firebase/collections'
import { DeepLinkError, handleDeepLinkError } from './errors'

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
 * Validates existence of the group, expense, or memory, and confirms the user
 * is a member before allowing navigation. Throws a DeepLinkError if invalid.
 */
async function validateRouteContent(resolved: ResolvedRoute, currentUid: string): Promise<any> {
  const { type, params } = resolved

  if (
    type === 'group_direct' ||
    type === 'group_settings' ||
    type === 'group_members' ||
    type === 'expense' ||
    type === 'memory_detail' ||
    type === 'on_this_day'
  ) {
    const { groupId } = params
    if (!groupId) throw new DeepLinkError('group_not_found')

    let groupSnap
    try {
      groupSnap = await getDoc(groupDoc(groupId))
    } catch (err: any) {
      if (err.code === 'unavailable' || err.message?.toLowerCase().includes('offline')) {
        throw new DeepLinkError('offline')
      }
      throw err
    }

    if (!groupSnap.exists()) {
      throw new DeepLinkError('group_not_found')
    }

    const groupData = groupSnap.data()
    if (!groupData.memberIds || !groupData.memberIds.includes(currentUid)) {
      throw new DeepLinkError('group_not_found')
    }

    if (type === 'expense') {
      const { expenseId } = params
      if (!expenseId) throw new DeepLinkError('content_deleted')

      const expenseSnap = await getDoc(expenseDoc(groupId, expenseId))
      if (!expenseSnap.exists()) {
        throw new DeepLinkError('content_deleted')
      }
    } else if (type === 'memory_detail') {
      const { memoryId } = params
      if (!memoryId) throw new DeepLinkError('content_deleted')

      const memorySnap = await getDoc(memoryDoc(groupId, memoryId))
      if (!memorySnap.exists()) {
        throw new DeepLinkError('content_deleted')
      }
    }

    return groupData
  }

  return null
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

  // Detect source from query params
  let source = urlSource
  const queryPart = url.split('?')[1]
  if (queryPart) {
    const searchParams = new URLSearchParams(queryPart)
    if (searchParams.get('source') === 'notification') {
      source = 'notification'
    }
  }

  const resolved = resolveRoute(parsed)
  if (!resolved) {
    trackDeepLinkFailed(parsed.type, parsed.screen || 'unknown', 'invalid_parameters', source)
    return
  }

  const isAuthenticated = authStatus === 'authenticated'
  const isPublic = PUBLIC_LINK_TYPES.has(resolved.type)

  trackDeepLinkOpened(resolved.type as any, resolved.screen, source)

  // Unauthenticated + protected → store for post-auth resume
  if (!isAuthenticated && !isPublic) {
    setPendingNavigation({
      type: resolved.type,
      params: resolved.params,
      raw_url: parsed.raw_url,
    })
    trackDeepLinkAuthGated(resolved.type as any)
    return
  }

  if (!navigationRef.isReady()) return

  void routeParsedLink(resolved, navigationRef, source)
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

  const parsed = parseDeepLink(target.raw_url)
  if (!parsed) return

  const resolved = resolveRoute(parsed)
  if (!resolved) return

  void routeParsedLink(resolved, navigationRef, 'warm_start')
}

/**
 * Core routing switch — translate a ParsedDeepLink to a navigation call.
 * All auth checks happen before this function is called.
 */
async function routeParsedLink(
  resolved: ResolvedRoute,
  navigationRef: NavigationContainerRef<RootStackParamList>,
  urlSource: 'cold_start' | 'warm_start' | 'notification',
): Promise<void> {
  const authUser = useAuthStore.getState().user
  const uid = authUser?.uid ?? ''

  useUIStore.getState().setGlobalLoading(true)

  try {
    // 1. Content validation and group invite handling
    if (resolved.type === 'group_invite') {
      if (!uid) {
        throw new DeepLinkError('invalid_link')
      }

      const result = await validateGroupInvite(resolved.params.code, uid)
      if (result.valid && result.group) {
        await useGroupStore.getState().joinGroup(resolved.params.code, uid)
        navigationRef.navigate('Main', {
          screen: 'HomeTab',
          params: {
            screen: 'GroupHome',
            params: { groupId: result.group.id, groupName: result.group.name },
          },
        } as any)
        trackDeepLinkResolved(resolved.type as any, 'GroupHome')
      } else {
        if (result.error === 'You are already a member of this group.' && result.group) {
          navigationRef.navigate('Main', {
            screen: 'HomeTab',
            params: {
              screen: 'GroupHome',
              params: { groupId: result.group.id, groupName: result.group.name },
            },
          } as any)
        } else {
          const errorType = result.error?.includes('expired') ? 'expired_invite' : 'invalid_link'
          throw new DeepLinkError(errorType, result.error)
        }
      }
      useUIStore.getState().setGlobalLoading(false)
      return
    }

    // Validate protected content existence and membership
    if (uid) {
      await validateRouteContent(resolved, uid)
    }

    // 2. Perform route navigation
    switch (resolved.type) {
      case 'group_direct':
        navigationRef.navigate('Main', {
          screen: 'HomeTab',
          params: {
            screen: 'GroupHome',
            params: { groupId: resolved.params.groupId, groupName: '' },
          },
        } as any)
        trackDeepLinkResolved(resolved.type as any, 'GroupHome')
        break

      case 'expense':
        navigationRef.navigate('Main', {
          screen: 'HomeTab',
          params: {
            screen: 'ExpenseDetail',
            params: { groupId: resolved.params.groupId, expenseId: resolved.params.expenseId },
          },
        } as any)
        trackDeepLinkResolved(resolved.type as any, 'ExpenseDetail')
        break

      case 'group_settings':
        navigationRef.navigate('Main', {
          screen: 'HomeTab',
          params: {
            screen: 'GroupSettings',
            params: { groupId: resolved.params.groupId },
          },
        } as any)
        trackDeepLinkResolved(resolved.type as any, 'GroupSettings')
        break

      case 'group_members':
        navigationRef.navigate('Main', {
          screen: 'HomeTab',
          params: {
            screen: 'GroupMembersManage',
            params: { groupId: resolved.params.groupId },
          },
        } as any)
        trackDeepLinkResolved(resolved.type as any, 'GroupMembersManage')
        break

      case 'memory_detail':
        navigationRef.navigate('Main', {
          screen: 'Memories',
          params: {
            screen: 'MemoryDetail',
            params: { groupId: resolved.params.groupId, memoryId: resolved.params.memoryId },
          },
        } as any)
        trackDeepLinkResolved(resolved.type as any, 'MemoryDetail')
        break

      case 'on_this_day':
        navigationRef.navigate('Main', {
          screen: 'Memories',
          params: {
            screen: 'OnThisDay',
            params: { groupId: resolved.params.groupId },
          },
        } as any)
        trackDeepLinkResolved(resolved.type as any, 'OnThisDay')
        break

      case 'recap':
        navigationRef.navigate('PublicRecap', { slug: resolved.params.slug })
        trackDeepLinkResolved(resolved.type as any, 'PublicRecap')
        break

      case 'referral':
        navigationRef.navigate('Main', undefined as any)
        trackDeepLinkResolved(resolved.type as any, 'HomeList')
        break

      case 'unknown':
      default:
        throw new DeepLinkError('invalid_link')
    }
  } catch (err: any) {
    const userFacing = handleDeepLinkError(err)
    useUIStore.getState().showToast({ message: userFacing.message, type: 'error' })
    navigationRef.navigate('Main', undefined as any)

    trackDeepLinkFailed(resolved.type as any, resolved.screen, userFacing.type, urlSource)
    captureError(err, { source: 'routeParsedLink', url: resolved.screen, type: resolved.type })
  } finally {
    useUIStore.getState().setGlobalLoading(false)
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
