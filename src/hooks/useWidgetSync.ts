// src/hooks/useWidgetSync.ts
// Derives widget payloads from live Zustand state and writes them to disk
// whenever the relevant state changes, then signals Android to re-render.
//
// Balance sync: subscribed to budget store settlement doc.
// Map sync: receives live location data as a prop (computed in the parent screen).
//
// Rules:
//   - Never poll — react to state changes only.
//   - All writes are non-blocking (fire-and-forget via void operator).
//   - Never import SDK-bound modules (Firebase, etc.) directly — use store selectors.

import { useEffect, useRef } from 'react'
import { useBudgetStore } from '@stores/budget.store'
import { useGroupStore } from '@stores/group.store'
import { useAuth } from './useAuth'
import { writeWidgetData, refreshWidgets } from '@lib/widget'
import type { MemberLocation } from '@lib/types/location.types'
import type { WidgetBalanceData, WidgetMapData, WidgetMember } from '@lib/widget'

/**
 * Call this hook inside GroupHomeScreen (or any screen that has both balance
 * and live location data in scope). It self-manages all subscription logic.
 *
 * @param liveLocations - Map<uid, MemberLocation> from useGroupLocations.
 *                        Pass an empty Map when location sharing is not active.
 */
export function useWidgetSync(
  liveLocations: Map<string, MemberLocation>
): void {
  const { user } = useAuth()
  const activeGroup = useGroupStore((s) => s.activeGroup)
  const settlementDoc = useBudgetStore((s) => s.settlementDoc)

  // Track previous values to avoid redundant writes
  const prevBalanceKey = useRef<string>('')
  const prevMapKey = useRef<string>('')

  // ── Balance sync ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid || !activeGroup) return

    const groupId = activeGroup.id
    const groupName = activeGroup.name ?? 'Your Group'

    let balanceRupees = 0

    if (settlementDoc?.balances) {
      const myBalance = settlementDoc.balances.find((b) => b.uid === user.uid)
      if (myBalance) {
        // netPaise is positive when you are owed, negative when you owe
        balanceRupees = myBalance.netPaise / 100
      }
    }

    const label: WidgetBalanceData['label'] =
      balanceRupees > 0
        ? 'You are owed'
        : balanceRupees < 0
          ? 'You owe'
          : 'All settled'

    const updatedAt = new Date().toISOString()

    // Deduplicate writes — skip if nothing changed
    const key = `${groupId}:${balanceRupees}:${label}`
    if (key === prevBalanceKey.current) return
    prevBalanceKey.current = key

    const balancePayload: WidgetBalanceData = {
      groupId,
      groupName,
      balanceRupees,
      label,
      updatedAt,
    }

    void writeWidgetData({ balance: balancePayload }).then(() => {
      refreshWidgets()
    })
  }, [user?.uid, activeGroup, settlementDoc])

  // ── Map sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeGroup) return

    const groupId = activeGroup.id
    const groupName = activeGroup.name ?? 'Your Group'

    const sharingMembers = Array.from(liveLocations.values()).filter(
      (loc) => loc.sharing
    )
    const sharingCount = sharingMembers.length

    const previewMembers: WidgetMember[] = sharingMembers
      .slice(0, 3)
      .map((loc) => ({
        uid: loc.userId,
        name: loc.name,
        avatarColor: loc.avatarColor,
        isLive: loc.status === 'live',
      }))

    const updatedAt = new Date().toISOString()

    // Deduplicate writes
    const key = `${groupId}:${sharingCount}:${previewMembers.map((m) => `${m.uid}:${m.isLive}`).join(',')}`
    if (key === prevMapKey.current) return
    prevMapKey.current = key

    const mapPayload: WidgetMapData = {
      groupId,
      groupName,
      sharingCount,
      previewMembers,
      updatedAt,
    }

    void writeWidgetData({ map: mapPayload }).then(() => {
      refreshWidgets()
    })
  }, [activeGroup, liveLocations])
}
