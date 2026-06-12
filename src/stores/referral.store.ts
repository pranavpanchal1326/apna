// src/stores/referral.store.ts
// Referral link + stats cache for dashboard and share actions.

import { create } from 'zustand'
import {
  ensureReferralLink,
  fetchReferralStats,
  type EnsureReferralLinkResult,
} from '@lib/firebase/referrals'
import type { ReferralStats } from '@lib/schemas/referral.schema'
import { captureError } from '@lib/sentry'

interface ReferralStore {
  link: EnsureReferralLinkResult | null
  stats: ReferralStats | null
  isLoading: boolean
  error: string | null

  loadDashboard: (
    uid: string,
    options?: { campaignId?: string; groupId?: string },
  ) => Promise<void>
  reset: () => void
}

export const useReferralStore = create<ReferralStore>((set) => ({
  link: null,
  stats: null,
  isLoading: false,
  error: null,

  loadDashboard: async (uid, options) => {
    set({ isLoading: true, error: null })
    try {
      const [link, stats] = await Promise.all([
        ensureReferralLink(options),
        fetchReferralStats(uid),
      ])
      set({ link, stats, isLoading: false })
    } catch (err) {
      captureError(err, { source: 'referral.store.loadDashboard' })
      set({ isLoading: false, error: 'Could not load referral info.' })
    }
  },

  reset: () => set({ link: null, stats: null, isLoading: false, error: null }),
}))
