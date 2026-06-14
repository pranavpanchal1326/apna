// src/navigation/deeplink/resolver.ts
import type { DeepLinkResult } from './parser'

export interface ResolvedRoute {
  screen: string
  params: Record<string, string>
  type: string
}

/**
 * Validates the required parameters of a parsed deep link and returns
 * a clean, resolved route for the navigation handler.
 * Returns null if any required parameter is missing or invalid.
 */
export function resolveRoute(parsed: DeepLinkResult | null): ResolvedRoute | null {
  if (!parsed) return null

  const { type, screen, params } = parsed

  switch (type) {
    case 'group_invite':
      if (!params.code) return null
      return { type, screen, params }

    case 'group_direct':
    case 'group_settings':
    case 'group_members':
    case 'on_this_day':
      if (!params.groupId) return null
      return { type, screen, params }

    case 'expense':
      if (!params.groupId || !params.expenseId) return null
      return { type, screen, params }

    case 'memory_detail':
      if (!params.groupId || !params.memoryId) return null
      return { type, screen, params }

    case 'recap':
      if (!params.slug) return null
      return { type, screen, params }

    case 'referral':
      if (!params.code) return null
      return { type, screen, params }

    case 'unknown':
      return { type, screen, params }

    default:
      return null
  }
}
