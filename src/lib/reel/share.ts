// src/lib/reel/share.ts
// Share-ready output delivery for memory reels.

import { Alert, Platform, Share } from 'react-native'
import * as Sharing from 'expo-sharing'
import * as Haptics from 'expo-haptics'
import { track } from '@lib/analytics'
import type { ReelPlan } from './types'

export async function shareReelMp4(
  outputUri: string,
  plan: ReelPlan,
): Promise<boolean> {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

  const message = `Our "${plan.tripName}" memory reel — made on apna.`

  try {
    if (Platform.OS === 'ios') {
      await Share.share({ message, url: outputUri })
    } else {
      const available = await Sharing.isAvailableAsync()
      if (available) {
        await Sharing.shareAsync(outputUri, {
          mimeType: 'video/mp4',
          dialogTitle: 'Share Memory Reel',
        })
      } else {
        await Share.share({ message })
      }
    }

    track('memory_reel_shared', {
      memory_count: plan.memoryCount,
      duration_ms: plan.totalDurationMs,
      context: plan.context,
      template: plan.template,
      export_type: 'mp4',
    })

    return true
  } catch {
    Alert.alert(
      'Share unavailable',
      'Your reel was saved, but the share sheet could not open. Try again from your gallery.',
    )
    return false
  }
}
