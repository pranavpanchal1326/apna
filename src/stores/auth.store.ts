// src/stores/auth.store.ts
// Central auth state. Single source of truth for:
//   - Whether user is authenticated
//   - The current User document (from Firestore)
//   - Auth loading / error states
//   - OTP flow state (verificationId, countdown)
//
// Persists: uid + user doc to MMKV so app reopens without re-auth.
// Firebase Auth handles JWT refresh silently via MMKV persistence (Prompt 0.1).

import { create } from 'zustand'
import { createMMKV } from 'react-native-mmkv'
import type { User } from '@lib/types'
import {
  subscribeToAuthState,
  getUserDoc,
  signOut as firebaseSignOut,
} from '@lib/firebase/auth'
import type { User as FirebaseUser } from 'firebase/auth'

const authStorage = createMMKV({ id: 'apna-auth' })
const USER_CACHE_KEY = 'cached-user'

// ── Helpers ──────────────────────────────────────────────────────
function cacheUser(user: User) {
  authStorage.set(USER_CACHE_KEY, JSON.stringify(user))
}

function getCachedUser(): User | null {
  const raw = authStorage.getString(USER_CACHE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

function clearUserCache() {
  authStorage.remove(USER_CACHE_KEY)
}

// ── Store types ───────────────────────────────────────────────────
type AuthStatus =
  | 'initializing'   // App just opened, checking Firebase Auth state
  | 'unauthenticated'// No Firebase user
  | 'needs_profile'  // Firebase user exists but no Firestore doc (new user)
  | 'authenticated'  // Firebase user + Firestore doc exist

interface OTPFlowState {
  verificationId: string | null
  phone: string
  countdown: number           // Seconds until resend allowed (60s)
  canResend: boolean
}

interface AuthStore {
  // ── State ───────────────────────────────────────────────────────
  status: AuthStatus
  firebaseUser: FirebaseUser | null
  user: User | null
  error: string | null
  isLoading: boolean

  // ── OTP flow ────────────────────────────────────────────────────
  otpFlow: OTPFlowState

  // ── Actions ─────────────────────────────────────────────────────
  initialize: () => () => void        // Returns unsubscribe fn for cleanup
  setFirebaseUser: (fbUser: FirebaseUser | null) => Promise<void>
  setUser: (user: User) => void
  setOTPVerificationId: (id: string, phone: string) => void
  startResendCountdown: () => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  logout: () => Promise<void>
  reset: () => void
}

const OTP_INITIAL: OTPFlowState = {
  verificationId: null,
  phone: '',
  countdown: 0,
  canResend: false,
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // ── Initial state ─────────────────────────────────────────────
  status: 'initializing',
  firebaseUser: null,
  user: getCachedUser(),   // Pre-populate from MMKV for instant UI
  error: null,
  isLoading: false,
  otpFlow: OTP_INITIAL,

  // ── initialize: Call once in App.tsx ─────────────────────────
  initialize: () => {
    const unsubscribe = subscribeToAuthState(async (fbUser) => {
      await get().setFirebaseUser(fbUser)
    })
    return unsubscribe
  },

  // ── React to Firebase Auth state changes ─────────────────────
  setFirebaseUser: async (fbUser) => {
    if (!fbUser) {
      clearUserCache()
      set({
        status: 'unauthenticated',
        firebaseUser: null,
        user: null,
        isLoading: false,
      })
      return
    }

    set({ firebaseUser: fbUser, isLoading: true })

    try {
      const userDoc = await getUserDoc(fbUser.uid)

      if (!userDoc) {
        // New user — needs to complete profile setup
        set({ status: 'needs_profile', isLoading: false })
      } else {
        cacheUser(userDoc)
        set({ status: 'authenticated', user: userDoc, isLoading: false })
      }
    } catch (err) {
      set({
        error: 'Failed to load profile. Please try again.',
        status: 'unauthenticated',
        isLoading: false,
      })
    }
  },

  setUser: (user) => {
    cacheUser(user)
    set({ user, status: 'authenticated' })
  },

  setOTPVerificationId: (id, phone) => {
    set((state) => ({
      otpFlow: {
        ...state.otpFlow,
        verificationId: id,
        phone,
        canResend: false,
      },
    }))
  },

  // ── 60s resend countdown timer ────────────────────────────────
  startResendCountdown: () => {
    set((state) => ({
      otpFlow: { ...state.otpFlow, countdown: 60, canResend: false },
    }))

    const interval = setInterval(() => {
      const current = get().otpFlow.countdown
      if (current <= 1) {
        clearInterval(interval)
        set((state) => ({
          otpFlow: { ...state.otpFlow, countdown: 0, canResend: true },
        }))
      } else {
        set((state) => ({
          otpFlow: { ...state.otpFlow, countdown: current - 1 },
        }))
      }
    }, 1000)
  },

  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),

  logout: async () => {
    set({ isLoading: true })
    try {
      await firebaseSignOut()
      clearUserCache()
      set({
        status: 'unauthenticated',
        firebaseUser: null,
        user: null,
        error: null,
        isLoading: false,
        otpFlow: OTP_INITIAL,
      })
    } catch {
      set({ isLoading: false, error: 'Sign out failed. Try again.' })
    }
  },

  reset: () =>
    set({
      status: 'initializing',
      firebaseUser: null,
      user: null,
      error: null,
      isLoading: false,
      otpFlow: OTP_INITIAL,
    }),
}))
