// src/hooks/useActivityFeed.ts
// Real-time activity feed hook with pagination.
// Subscribes to latest FEED_PAGE_SIZE items live.
// User can "load more" to fetch older items via pagination.

import { useEffect, useReducer, useCallback, useRef } from 'react'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import {
  subscribeToActivityFeed,
  fetchActivityPage,
  FEED_PAGE_SIZE,
} from '@lib/firebase/activity'
import type { ActivityItem } from '@lib/schemas'
import { captureError } from '@lib/sentry'

interface FeedState {
  items:       ActivityItem[]
  isLoading:   boolean
  isLoadingMore: boolean
  hasMore:     boolean
  error:       string | null
}

type FeedAction =
  | { type: 'LIVE_UPDATE';  items: ActivityItem[] }
  | { type: 'PAGE_LOADED';  items: ActivityItem[]; hasMore: boolean }
  | { type: 'LOADING_MORE' }
  | { type: 'ERROR';        message: string }
  | { type: 'RESET' }

function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case 'LIVE_UPDATE':
      return {
        ...state,
        items:     action.items,
        isLoading: false,
        error:     null,
      }
    case 'PAGE_LOADED':
      return {
        ...state,
        // Merge: newer live items + older paginated items, deduplicated by id
        items: dedupeById([...state.items, ...action.items]),
        isLoadingMore: false,
        hasMore:       action.hasMore,
      }
    case 'LOADING_MORE':
      return { ...state, isLoadingMore: true }
    case 'ERROR':
      return { ...state, isLoading: false, isLoadingMore: false, error: action.message }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

function dedupeById(items: ActivityItem[]): ActivityItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

const initialState: FeedState = {
  items:         [],
  isLoading:     true,
  isLoadingMore: false,
  hasMore:       true,
  error:         null,
}

export function useActivityFeed(groupId: string | null) {
  const [state, dispatch] = useReducer(feedReducer, initialState)
  const lastDocRef        = useRef<QueryDocumentSnapshot | null>(null)

  // Subscribe to live feed on mount
  useEffect(() => {
    if (!groupId) return
    dispatch({ type: 'RESET' })
    lastDocRef.current = null

    const unsub = subscribeToActivityFeed(
      groupId,
      (items) => dispatch({ type: 'LIVE_UPDATE', items }),
      (err)   => dispatch({ type: 'ERROR', message: err.message })
    )

    return () => unsub()
  }, [groupId])

  // Load older items (pagination)
  const loadMore = useCallback(async () => {
    if (!groupId || state.isLoadingMore || !state.hasMore) return
    dispatch({ type: 'LOADING_MORE' })

    try {
      const { items, lastDoc } = await fetchActivityPage(
        groupId,
        lastDocRef.current ?? undefined
      )
      lastDocRef.current = lastDoc
      dispatch({
        type:    'PAGE_LOADED',
        items,
        hasMore: items.length === FEED_PAGE_SIZE,
      })
    } catch (err) {
      captureError(err, { source: 'useActivityFeed.loadMore', groupId })
      dispatch({ type: 'ERROR', message: 'Could not load more activity.' })
    }
  }, [groupId, state.isLoadingMore, state.hasMore])

  return { ...state, loadMore }
}
