// src/lib/haptics/patterns.ts
import { hapticEngine } from './engine'

export const haptics = {
  // ── PRD-mandated triggers ──────────────────────────────────────

  /**
   * PRD Section 7: "Haptic feedback on: expense added"
   * A confident medium impact — money was recorded, action is done.
   */
  async expenseAdded(): Promise<void> {
    await hapticEngine.impactMedium()
  },

  /**
   * PRD Section 7: "Haptic feedback on: settle up"
   * Double impact — debt is cleared, a significant moment.
   * Pattern: medium → 80ms pause → light
   */
  async settleUp(): Promise<void> {
    await hapticEngine.impactMedium()
    await new Promise((resolve) => setTimeout(resolve, 80))
    await hapticEngine.impactLight()
  },

  /**
   * PRD Section 7: "Haptic feedback on: SOS ping"
   * The most urgent haptic in the app. Must feel alarming.
   * Pattern: heavy → 60ms → heavy → 60ms → heavy
   */
  async sosPing(): Promise<void> {
    const config = hapticEngine.getConfig()
    if (config.capabilityLevel === 'basic') {
      await hapticEngine.impactHeavy()
    } else {
      await hapticEngine.impactHeavy()
      await new Promise((resolve) => setTimeout(resolve, 60))
      await hapticEngine.impactHeavy()
      await new Promise((resolve) => setTimeout(resolve, 60))
      await hapticEngine.impactHeavy()
    }
  },

  /**
   * PRD Section 7: "Haptic feedback on: QR scan success"
   * Success notification — clean, positive.
   */
  async qrScanSuccess(): Promise<void> {
    await hapticEngine.notificationSuccess()
  },

  // ── Extended triggers (high emotional value moments) ──────────

  /**
   * Memory posted — photos uploaded and saved.
   * Pattern: success notification
   */
  async memoryPosted(): Promise<void> {
    await hapticEngine.notificationSuccess()
  },

  /**
   * Itinerary item confirmed (tentative → confirmed).
   * Pattern: medium impact — "locked in" feeling.
   */
  async itineraryItemConfirmed(): Promise<void> {
    await hapticEngine.impactMedium()
  },

  /**
   * Location sharing enabled.
   * Pattern: light impact — toggle on.
   */
  async locationSharingOn(): Promise<void> {
    await hapticEngine.impactLight()
  },

  /**
   * Location sharing disabled.
   * Pattern: selection changed — toggle off, lighter than on.
   */
  async locationSharingOff(): Promise<void> {
    await hapticEngine.selectionChanged()
  },

  /**
   * New member joined the group — seen in activity feed.
   * Pattern: light impact — positive but subtle.
   */
  async memberJoined(): Promise<void> {
    await hapticEngine.impactLight()
  },

  /**
   * Reaction added to a memory.
   * Pattern: selection changed — lightweight acknowledgement.
   */
  async reactionAdded(): Promise<void> {
    await hapticEngine.selectionChanged()
  },

  /**
   * Destructive action confirmed (leave group, delete expense, dissolve group).
   * Pattern: warning notification — pause for thought.
   */
  async destructiveConfirmed(): Promise<void> {
    await hapticEngine.notificationWarning()
  },

  /**
   * Error state — invalid input, network failure on critical action.
   * Pattern: error notification
   */
  async errorOccurred(): Promise<void> {
    await hapticEngine.notificationError()
  },
}
