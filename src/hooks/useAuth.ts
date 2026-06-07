// src/hooks/useAuth.ts
// Convenience hook — select only what each screen needs.
// Never import useAuthStore directly in screens — use this hook.

import { useAuthStore } from '@stores/auth.store'

export function useAuth() {
  const status       = useAuthStore((s) => s.status)
  const user         = useAuthStore((s) => s.user)
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const isLoading    = useAuthStore((s) => s.isLoading)
  const error        = useAuthStore((s) => s.error)
  const otpFlow      = useAuthStore((s) => s.otpFlow)
  const logout       = useAuthStore((s) => s.logout)
  const setError     = useAuthStore((s) => s.setError)

  const isAuthenticated = status === 'authenticated'
  const isInitializing  = status === 'initializing'
  const needsProfile    = status === 'needs_profile'

  return {
    status,
    user,
    firebaseUser,
    isLoading,
    error,
    otpFlow,
    logout,
    setError,
    isAuthenticated,
    isInitializing,
    needsProfile,
  }
}
