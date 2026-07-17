// src/lib/utils/__tests__/netPosition.test.ts
import { groupNetForUser, totalNetForUser, netTone } from '../netPosition'
import type { SettlementBalance } from '@lib/schemas/group.schema'

const b = (fromUid: string, toUid: string, amount: number): SettlementBalance => ({
  fromUid, toUid, amount,
})

describe('groupNetForUser', () => {
  it('sums amounts owed TO the user as positive', () => {
    const balances = [b('bob', 'me', 300), b('cara', 'me', 200)]
    expect(groupNetForUser(balances, 'me')).toBe(500)
  })

  it('sums amounts the user OWES as negative', () => {
    const balances = [b('me', 'bob', 450)]
    expect(groupNetForUser(balances, 'me')).toBe(-450)
  })

  it('nets owed and owing together', () => {
    const balances = [b('bob', 'me', 300), b('me', 'cara', 100)]
    expect(groupNetForUser(balances, 'me')).toBe(200)
  })

  it('ignores balances not involving the user', () => {
    expect(groupNetForUser([b('bob', 'cara', 999)], 'me')).toBe(0)
  })

  it('returns 0 for missing balances or uid', () => {
    expect(groupNetForUser(undefined, 'me')).toBe(0)
    expect(groupNetForUser([b('bob', 'me', 10)], undefined)).toBe(0)
  })
})

describe('totalNetForUser', () => {
  it('sums net across every group', () => {
    const groups = [
      { balances: [b('bob', 'me', 300)] },      // +300
      { balances: [b('me', 'cara', 800)] },      // -800
      { balances: [b('dan', 'me', 250)] },       // +250
    ]
    expect(totalNetForUser(groups, 'me')).toBe(-250)
  })

  it('handles groups with no balances', () => {
    expect(totalNetForUser([{}, { balances: [] }], 'me')).toBe(0)
  })
})

describe('netTone', () => {
  it('buckets owed / owe / settled with a ₹1 dust floor', () => {
    expect(netTone(500)).toBe('owed')
    expect(netTone(-500)).toBe('owe')
    expect(netTone(0)).toBe('settled')
    expect(netTone(0.4)).toBe('settled')  // dust
    expect(netTone(-0.9)).toBe('settled') // dust
  })
})
