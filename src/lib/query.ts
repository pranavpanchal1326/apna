// src/lib/query.ts
// TanStack Query v5 client configuration.
// Single QueryClient instance shared across the app.
// Conservative defaults for mobile — longer stale times, fewer background refetches.
// Indian mobile networks are often intermittent — never fail silently on network errors.

import { QueryClient } from '@tanstack/react-query'
import { captureError } from './sentry'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 2 minutes on mobile (vs 0ms web default)
      staleTime: 1000 * 60 * 2,

      // Keep unused data in cache for 10 minutes (background refetch on next use)
      gcTime: 1000 * 60 * 10,

      // Retry failed queries 2 times with exponential backoff
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),

      // Don't refetch on window focus — mobile app doesn't have "windows"
      refetchOnWindowFocus: false,

      // DO refetch when network reconnects — critical for Indian connectivity
      refetchOnReconnect: true,
    },
    mutations: {
      // Capture all mutation errors to Sentry automatically
      onError: (error) => {
        captureError(error, { source: 'react-query-mutation' })
      },
      retry: 1,
    },
  },
})
