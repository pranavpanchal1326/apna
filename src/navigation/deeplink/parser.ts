// src/navigation/deeplink/parser.ts
// Central URL parser for all deep links entering the app.
// Handles apna:// scheme and https://apna.app universal links.
// Returns a typed ParsedDeepLink or null for invalid/unsupported URLs.
// Never throws — all errors result in null.

export type DeepLinkType =
  | 'group_invite'    // /join?code=GOA26A
  | 'group_direct'    // /group/:groupId
  | 'expense'         // /group/:groupId/expense/:expenseId
  | 'group_settings'  // /group/:groupId/settings
  | 'group_members'   // /group/:groupId/members
  | 'memory_detail'   // /memories/:groupId/detail/:memoryId
  | 'on_this_day'     // /memories/:groupId/on-this-day
  | 'recap'           // /recap/:slug
  | 'referral'        // /r/:code
  | 'unknown'

export interface ParsedDeepLink {
  type: DeepLinkType
  params: Record<string, string>
  raw_url: string
  parsed_at: number
}

const PREFIXES = ['apna://', 'https://apna.app/', 'http://apna.app/']

// ── Normalise to a plain path string ─────────────────────────────
function normalisePath(url: string): { path: string; query: URLSearchParams } | null {
  const trimmed = url.trim()

  let rest = trimmed
  for (const prefix of PREFIXES) {
    if (trimmed.toLowerCase().startsWith(prefix)) {
      rest = trimmed.slice(prefix.length)
      break
    }
  }

  const [pathPart, queryPart] = rest.split('?')
  const path = pathPart?.replace(/\/+$/, '').toLowerCase() // strip trailing slash, lowercase
  const query = new URLSearchParams(queryPart ?? '')

  return { path, query }
}

// ── Route matchers ────────────────────────────────────────────────
const GROUP_RE         = /^group\/([a-z0-9_-]+)$/i
const EXPENSE_RE       = /^group\/([a-z0-9_-]+)\/expense\/([a-z0-9_-]+)$/i
const SETTINGS_RE      = /^group\/([a-z0-9_-]+)\/settings$/i
const MEMBERS_RE       = /^group\/([a-z0-9_-]+)\/members$/i
const MEMORY_DETAIL_RE = /^memories\/([a-z0-9_-]+)\/detail\/([a-z0-9_-]+)$/i
const ON_THIS_DAY_RE   = /^memories\/([a-z0-9_-]+)\/on-this-day$/i
const RECAP_RE         = /^recap\/([a-z0-9][a-z0-9-]{3,62})$/i
const REFERRAL_RE      = /^r\/([a-z0-9]{4,32})$/i
const INVITE_CODE_RE   = /^[A-Z0-9]{6}$/

function validateInviteCode(code: string): string | null {
  const upper = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return INVITE_CODE_RE.test(upper) ? upper : null
}

// ── Main parser ───────────────────────────────────────────────────
export function parseDeepLink(url: string): ParsedDeepLink | null {
  if (!url || typeof url !== 'string') return null

  const normalised = normalisePath(url)
  if (!normalised) return null

  const { path, query } = normalised
  const base: Pick<ParsedDeepLink, 'raw_url' | 'parsed_at'> = {
    raw_url: url.trim(),
    parsed_at: Date.now(),
  }

  // ── Group invite: /join?code=GOA26A ───────────────────────────
  if (path === 'join' || path === 'joingroup') {
    const raw = query.get('code') ?? query.get('c') ?? ''
    const code = validateInviteCode(raw)
    if (!code) return { type: 'unknown', params: {}, ...base }
    return { type: 'group_invite', params: { code }, ...base }
  }

  // ── Expense: /group/:groupId/expense/:expenseId ───────────────
  let m = path.match(EXPENSE_RE)
  if (m) {
    return { type: 'expense', params: { groupId: m[1], expenseId: m[2] }, ...base }
  }

  // ── Group settings ────────────────────────────────────────────
  m = path.match(SETTINGS_RE)
  if (m) {
    return { type: 'group_settings', params: { groupId: m[1] }, ...base }
  }

  // ── Group members ─────────────────────────────────────────────
  m = path.match(MEMBERS_RE)
  if (m) {
    return { type: 'group_members', params: { groupId: m[1] }, ...base }
  }

  // ── Group direct: /group/:groupId ─────────────────────────────
  m = path.match(GROUP_RE)
  if (m) {
    return { type: 'group_direct', params: { groupId: m[1] }, ...base }
  }

  // ── Memory detail: /memories/:groupId/detail/:memoryId ────────
  m = path.match(MEMORY_DETAIL_RE)
  if (m) {
    return { type: 'memory_detail', params: { groupId: m[1], memoryId: m[2] }, ...base }
  }

  // ── On this day: /memories/:groupId/on-this-day ───────────────
  m = path.match(ON_THIS_DAY_RE)
  if (m) {
    return { type: 'on_this_day', params: { groupId: m[1] }, ...base }
  }

  // ── Recap: /recap/:slug ───────────────────────────────────────
  m = path.match(RECAP_RE)
  if (m) {
    return { type: 'recap', params: { slug: m[1].toLowerCase() }, ...base }
  }

  // ── Referral: /r/:code ────────────────────────────────────────
  m = path.match(REFERRAL_RE)
  if (m) {
    const campaignId = query.get('c') ?? 'default'
    const groupId    = query.get('g') ?? undefined
    return {
      type: 'referral',
      params: {
        code: m[1].toUpperCase(),
        campaignId,
        ...(groupId ? { groupId } : {}),
      },
      ...base,
    }
  }

  return { type: 'unknown', params: {}, ...base }
}
