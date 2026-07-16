// functions/src/engine/__tests__/balanceEngine.test.ts
// Server-side money math — the authoritative balance engine.

import {
  calculateNetBalances,
  applySettlements,
  simplifyDebts,
  buildGroupBalance,
  checkConservation,
  type FnExpense,
  type FnSettlement,
} from '../balanceEngine'

const MEMBERS = ['arjun', 'riya', 'kabir']

function expense(paidBy: string, amount: number, splits: Record<string, number>, extra: Partial<FnExpense> = {}): FnExpense {
  return { paidBy, amount, splits, ...extra }
}

describe('calculateNetBalances', () => {
  it('returns zero balances with no expenses', () => {
    const net = calculateNetBalances([], MEMBERS)
    expect(net).toEqual({ arjun: 0, riya: 0, kabir: 0 })
  })

  it('credits payer and debits participants (equal split)', () => {
    const net = calculateNetBalances(
      [expense('arjun', 300, { arjun: 100, riya: 100, kabir: 100 })],
      MEMBERS,
    )
    expect(net.arjun).toBe(20000)   // paid 30000, owes 10000
    expect(net.riya).toBe(-10000)
    expect(net.kabir).toBe(-10000)
  })

  it('handles non-divisible amounts in paise without drift beyond rounding', () => {
    // ₹100 split 3 ways: 33.33 + 33.33 + 33.34
    const net = calculateNetBalances(
      [expense('arjun', 100, { arjun: 33.33, riya: 33.33, kabir: 33.34 })],
      MEMBERS,
    )
    expect(net.arjun).toBe(10000 - 3333)
    expect(net.riya).toBe(-3333)
    expect(net.kabir).toBe(-3334)
    expect(checkConservation(net).isValid).toBe(true)
  })

  it('skips deleted expenses', () => {
    const net = calculateNetBalances(
      [expense('arjun', 300, { riya: 300 }, { status: 'deleted' })],
      MEMBERS,
    )
    expect(net).toEqual({ arjun: 0, riya: 0, kabir: 0 })
  })

  it('handles payers/participants outside memberIds gracefully', () => {
    const net = calculateNetBalances(
      [expense('ghost', 100, { arjun: 100 })],
      MEMBERS,
    )
    expect(net.ghost).toBe(10000)
    expect(net.arjun).toBe(-10000)
  })

  it('accumulates across multiple expenses', () => {
    const net = calculateNetBalances(
      [
        expense('arjun', 200, { arjun: 100, riya: 100 }),
        expense('riya', 100, { arjun: 50, riya: 50 }),
      ],
      MEMBERS,
    )
    expect(net.arjun).toBe(10000 - 5000)  // +100 −50
    expect(net.riya).toBe(-10000 + 5000)  // −100 +50
    expect(net.kabir).toBe(0)
  })
})

describe('applySettlements', () => {
  it('moves debt from debtor toward creditor', () => {
    const net = { arjun: 10000, riya: -10000 }
    const settled = applySettlements(net, [
      { fromUid: 'riya', toUid: 'arjun', amountPaise: 10000 } satisfies FnSettlement,
    ])
    expect(settled.riya).toBe(0)
    expect(settled.arjun).toBe(0)
  })

  it('supports partial settlements', () => {
    const settled = applySettlements({ arjun: 10000, riya: -10000 }, [
      { fromUid: 'riya', toUid: 'arjun', amountPaise: 4000 },
    ])
    expect(settled.riya).toBe(-6000)
    expect(settled.arjun).toBe(6000)
  })

  it('does not mutate the input map', () => {
    const net = { arjun: 100, riya: -100 }
    applySettlements(net, [{ fromUid: 'riya', toUid: 'arjun', amountPaise: 100 }])
    expect(net.arjun).toBe(100)
  })
})

describe('simplifyDebts', () => {
  it('returns no debts when everyone is settled', () => {
    expect(simplifyDebts({ arjun: 0, riya: 0 })).toEqual([])
  })

  it('ignores dust balances (≤1 paise)', () => {
    expect(simplifyDebts({ arjun: 1, riya: -1 })).toEqual([])
  })

  it('produces at most N-1 transactions', () => {
    const net = { a: 30000, b: -10000, c: -10000, d: -10000 }
    const debts = simplifyDebts(net)
    expect(debts.length).toBeLessThanOrEqual(3)
    // All flows go to the single creditor
    debts.forEach((d) => expect(d.toUid).toBe('a'))
    expect(debts.reduce((s, d) => s + d.amountPaise, 0)).toBe(30000)
  })

  it('nets out chains: A owes B, B owes C collapses to A→C', () => {
    // A paid nothing, owes 100. B is flat (owed 100, owes 100). C is owed 100.
    const debts = simplifyDebts({ a: -10000, b: 0, c: 10000 })
    expect(debts).toHaveLength(1)
    expect(debts[0]).toMatchObject({ fromUid: 'a', toUid: 'c', amountPaise: 10000 })
  })

  it('zeroes all balances after applying the produced debts', () => {
    const net: Record<string, number> = { a: 55532, b: -20011, c: -12345, d: -23176 }
    const debts = simplifyDebts(net)
    const after = { ...net }
    for (const d of debts) {
      after[d.fromUid] += d.amountPaise
      after[d.toUid] -= d.amountPaise
    }
    Object.values(after).forEach((v) => expect(Math.abs(v)).toBeLessThanOrEqual(1))
  })
})

describe('buildGroupBalance', () => {
  it('builds a full summary and marks group settled after full settlement', () => {
    const expenses = [expense('arjun', 300, { arjun: 100, riya: 100, kabir: 100 })]
    const settlements: FnSettlement[] = [
      { fromUid: 'riya', toUid: 'arjun', amountPaise: 10000 },
      { fromUid: 'kabir', toUid: 'arjun', amountPaise: 10000 },
    ]
    const result = buildGroupBalance(expenses, MEMBERS, settlements)
    expect(result.isFullySettled).toBe(true)
    expect(result.debts).toEqual([])
    expect(result.totalPaise).toBe(30000)
    expect(result.totalRupees).toBe(300)
    result.balances.forEach((b) => expect(b.isSettled).toBe(true))
  })

  it('excludes deleted expenses from totals', () => {
    const result = buildGroupBalance(
      [
        expense('arjun', 100, { riya: 100 }),
        expense('arjun', 999, { riya: 999 }, { status: 'deleted' }),
      ],
      MEMBERS,
      [],
    )
    expect(result.totalPaise).toBe(10000)
    expect(result.debts).toHaveLength(1)
    expect(result.debts[0]).toMatchObject({ fromUid: 'riya', toUid: 'arjun', amountPaise: 10000 })
  })

  it('flags payer/debtor roles correctly', () => {
    const result = buildGroupBalance(
      [expense('arjun', 200, { riya: 200 })],
      ['arjun', 'riya'],
      [],
    )
    const arjun = result.balances.find((b) => b.uid === 'arjun')!
    const riya = result.balances.find((b) => b.uid === 'riya')!
    expect(arjun.isPayer).toBe(true)
    expect(riya.isDebtor).toBe(true)
  })
})

describe('checkConservation', () => {
  it('accepts drift within 1 paise per member', () => {
    expect(checkConservation({ a: 2, b: -1, c: 0 }).isValid).toBe(true)
  })

  it('rejects drift beyond tolerance', () => {
    const result = checkConservation({ a: 500, b: -1 })
    expect(result.isValid).toBe(false)
    expect(result.drift).toBe(499)
  })
})
