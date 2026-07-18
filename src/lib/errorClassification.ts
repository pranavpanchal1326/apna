// src/lib/errorClassification.ts
// Pure, dependency-free classification of error objects. Kept separate from
// sentry.ts (which pulls in native modules) so it is unit-testable in isolation.

// Expected, non-actionable failure modes: the user is signed out, offline, a
// token is mid-refresh, or Firestore rules legitimately deny access to data the
// user can't see. These are not bugs — reporting them spams Sentry and (in dev)
// throws a red LogBox. Callers log them quietly and never send them upstream.
const EXPECTED_ERROR_CODES = new Set([
  'permission-denied',
  'unauthenticated',
  'unavailable',
  'auth/network-request-failed',
  'auth/user-token-expired',
  'auth/no-current-user',
  'functions/unauthenticated',
  'functions/permission-denied',
  'functions/unavailable',
])

const EXPECTED_ERROR_PATTERN =
  /sign in required|insufficient permissions|missing or insufficient|network request failed|client is offline|unavailable/i

/** True when an error is an expected/non-actionable auth, permission, or offline failure. */
export function isExpectedError(error: unknown): boolean {
  if (!error) return false
  const code = (error as { code?: unknown })?.code
  if (typeof code === 'string' && EXPECTED_ERROR_CODES.has(code)) return true
  const message = error instanceof Error ? error.message : String(error)
  return EXPECTED_ERROR_PATTERN.test(message)
}
