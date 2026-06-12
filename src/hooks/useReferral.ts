// src/hooks/useReferral.ts
// Screen-facing referral hook — share, stats, pending capture state.

import { useCallback, useEffect, useState } from 'react'
import { Share, Alert } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { useAuth } from './useAuth'
import { useReferralStore } from '@stores/referral.store'
import { track } from '@lib/analytics'
import { buildReferralShareMessage } from '@lib/referral/referral.links'
import { getPendingReferral } from '@lib/referral/referral.storage'
import {
  flushPendingReferralAttribution,
  processReferralQualification,
} from '@lib/firebase/referrals'
import type { ReferralSource } from '@lib/schemas/referral.schema'
import { REFERRAL_CAMPAIGNS, DEFAULT_REFERRAL_CAMPAIGN_ID } from '@lib/schemas/referral.schema'

export function useReferral(options?: { groupId?: string; groupName?: string }) {
  const { user, isAuthenticated } = useAuth()
  const { link, stats, isLoading, error, loadDashboard } = useReferralStore()
  const [pendingReferral, setPendingReferral] = useState(getPendingReferral())

  const refreshPending = useCallback(() => {
    setPendingReferral(getPendingReferral())
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !user?.uid) return
    void loadDashboard(user.uid, { groupId: options?.groupId })
    if (getPendingReferral()) {
      void flushPendingReferralAttribution(user.uid).then(() => refreshPending())
    }
  }, [isAuthenticated, user?.uid, options?.groupId, loadDashboard, refreshPending])

  const shareReferral = useCallback(
    async (source: ReferralSource, entryPoint: string) => {
      if (!link || !user) return

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const message = buildReferralShareMessage(user.name, link.url, {
        groupName: options?.groupName,
      })

      try {
        await Share.share({ message, url: link.url })
        track('referral_link_shared', {
          referrer_user_id: user.uid,
          campaign_id: link.campaignId,
          source,
          entry_point: entryPoint,
          flow_variant: options?.groupId ? 'group_context' : 'default',
        })
      } catch {
        Alert.alert('Share failed', 'Could not open the share sheet.')
      }
    },
    [link, user, options?.groupName, options?.groupId],
  )

  const copyReferralLink = useCallback(
    async (_source: ReferralSource, entryPoint: string) => {
      if (!link || !user) return

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      await Clipboard.setStringAsync(link.url)
      track('referral_link_shared', {
        referrer_user_id: user.uid,
        campaign_id: link.campaignId,
        source: 'copy_link',
        entry_point: entryPoint,
        flow_variant: options?.groupId ? 'group_context' : 'default',
      })
      Alert.alert('Link copied', 'Your referral link is ready to paste.')
    },
    [link, user, options?.groupId],
  )

  const commitPendingAttribution = useCallback(async () => {
    if (!user?.uid) return null
    const result = await flushPendingReferralAttribution(user.uid)
    refreshPending()
    return result
  }, [user?.uid, refreshPending])

  const tryQualifyReferral = useCallback(
    async (groupId?: string) => {
      const result = await processReferralQualification(groupId)
      if (user?.uid) {
        await loadDashboard(user.uid, { groupId: options?.groupId })
      }
      return result
    },
    [user?.uid, options?.groupId, loadDashboard],
  )

  const campaign = REFERRAL_CAMPAIGNS[DEFAULT_REFERRAL_CAMPAIGN_ID]

  return {
    link,
    stats,
    isLoading,
    error,
    pendingReferral,
    refreshPending,
    shareReferral,
    copyReferralLink,
    commitPendingAttribution,
    tryQualifyReferral,
    campaign,
    rewardRuleText: `Friends qualify when they join their first group. You earn a ${campaign.rewardType === 'badge' ? 'referral badge' : 'reward'} when they do.`,
  }
}
