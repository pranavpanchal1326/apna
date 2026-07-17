// src/lib/utils/netPosition.ts
// Net-position helpers — Blueprint §4.2.1 (Home hero) and §4.3.1 (GroupHome
// my-position strip). Derives the current user's net from a group's persisted
// simplified-debt plan (`group.balances`, amounts in rupees: fromUid owes
// toUid `amount`). Positive = you're owed; negative = you owe; 0 = settled.

import type { SettlementBalance } from '@lib/schemas/group.schema'

/** Net rupees for `uid` within one group's balance plan. */
export function groupNetForUser(
  balances: SettlementBalance[] | undefined,
  uid: string | undefined
): number {
  if (!balances || !uid) return 0
  let net = 0
  for (const b of balances) {
    if (b.toUid === uid) net += b.amount    // owed to you
    if (b.fromUid === uid) net -= b.amount   // you owe
  }
  return net
}

/** Net rupees for `uid` summed across every group. */
export function totalNetForUser(
  groups: Array<{ balances?: SettlementBalance[] }>,
  uid: string | undefined
): number {
  return groups.reduce((sum, g) => sum + groupNetForUser(g.balances, uid), 0)
}

export type NetTone = 'owed' | 'owe' | 'settled'

/** Bucket a net amount. Dust (< ₹1) reads as settled. */
export function netTone(net: number): NetTone {
  if (Math.abs(net) < 1) return 'settled'
  return net > 0 ? 'owed' : 'owe'
}
