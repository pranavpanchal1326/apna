// src/lib/engine/__tests__/settlementEngine.test.ts
// 12 unit tests for settlement computation. Run: npx jest settlementEngine

import {
  computeBalances,
  simplifyDebts,
  categoryBreakdown,
  budgetUtilisation,
} from '../settlementEngine'

const MEMBERS = [
  { uid: 'alice', name: 'Alice', avatarColor: '#4ECDC4' },
  { uid: 'bob',   name: 'Bob',   avatarColor: '#FF6B6B' },
  { uid: 'carol', name: 'Carol', avatarColor: '#FFD166' },
]

describe('computeBalances', () => {
  it('equal split — 3 people, 1 payer', () => {
    const expenses = [{
      payerUid: 'alice',
      shares: [
        { uid: 'alice', amountPaise: 3334 },
        { uid: 'bob',   amountPaise: 3333 },
        { uid: 'carol', amountPaise: 3333 },
      ],
    }]
    const balances = computeBalances(expenses, MEMBERS)
    const alice = balances.find((b) => b.uid === 'alice')!
    const bob   = balances.find((b) => b.uid === 'bob')!
    expect(alice.netPaise).toBe(10000 - 3334)  // paid 10000, owes 3334 → net +6666
    expect(bob.netPaise).toBe(-3333)            // paid 0, owes 3333
  })

  it('zero expenses → all zero balances', () => {
    const balances = computeBalances([], MEMBERS)
    balances.forEach((b) => expect(b.netPaise).toBe(0))
  })

  it('conservation — total net paise sums to zero', () => {
    const expenses = [
      { payerUid: 'alice', shares: [{ uid: 'bob', amountPaise: 5000 }, { uid: 'carol', amountPaise: 5000 }] },
      { payerUid: 'bob',   shares: [{ uid: 'alice', amountPaise: 3000 }] },
    ]
    const balances = computeBalances(expenses, MEMBERS)
    const total = balances.reduce((s, b) => s + b.netPaise, 0)
    expect(total).toBe(0)
  })
})

describe('simplifyDebts', () => {
  it('2 people — 1 transaction', () => {
    const balances = computeBalances([{
      payerUid: 'alice',
      shares: [{ uid: 'alice', amountPaise: 0 }, { uid: 'bob', amountPaise: 10000 }],
    }], MEMBERS)
    const s = simplifyDebts(balances)
    expect(s).toHaveLength(1)
    expect(s[0].fromUid).toBe('bob')
    expect(s[0].toUid).toBe('alice')
    expect(s[0].amountPaise).toBe(10000)
  })

  it('circular 3-person debt → max 2 transactions', () => {
    // Alice→Bob 10, Bob→Carol 10, Carol→Alice 10 = net zero for all
    const expenses = [
      { payerUid: 'alice', shares: [{ uid: 'bob', amountPaise: 10000 }] },
      { payerUid: 'bob',   shares: [{ uid: 'carol', amountPaise: 10000 }] },
      { payerUid: 'carol', shares: [{ uid: 'alice', amountPaise: 10000 }] },
    ]
    const balances = computeBalances(expenses, MEMBERS)
    const s = simplifyDebts(balances)
    // All net to zero — no settlements needed
    expect(s).toHaveLength(0)
  })

  it('all already settled → empty settlements', () => {
    const balances = MEMBERS.map((m) => ({
      uid: m.uid, displayName: m.name, avatarColor: m.avatarColor,
      netPaise: 0, totalPaid: 0, totalOwed: 0,
    }))
    expect(simplifyDebts(balances)).toHaveLength(0)
  })

  it('n-1 max transaction guarantee — 5 members', () => {
    const five = ['a','b','c','d','e'].map((id) => ({
      uid: id, name: id, avatarColor: '#fff',
    }))
    const expenses = [
      { payerUid: 'a', shares: [{ uid:'b', amountPaise:10000 }, { uid:'c', amountPaise:10000 }, { uid:'d', amountPaise:10000 }, { uid:'e', amountPaise:10000 }] },
    ]
    const balances = computeBalances(expenses, five)
    const s = simplifyDebts(balances)
    expect(s.length).toBeLessThanOrEqual(4)   // n-1 = 4
  })
})

describe('categoryBreakdown', () => {
  it('returns correct percentages', () => {
    const expenses = [
      { category: 'food', amountPaise: 6000 },
      { category: 'food', amountPaise: 4000 },
      { category: 'stay', amountPaise: 10000 },
    ]
    const result = categoryBreakdown(expenses)
    const food = result.find((c) => c.category === 'food')!
    const stay = result.find((c) => c.category === 'stay')!
    expect(food.totalPaise).toBe(10000)
    expect(food.percentage).toBe(50)
    expect(stay.percentage).toBe(50)
  })
})

describe('budgetUtilisation', () => {
  it('over budget detection', () => {
    const result = budgetUtilisation(100, [{ amountPaise: 12000 }])
    expect(result.isOverBudget).toBe(true)
    expect(result.percentageUsed).toBe(100)  // capped at 100
  })

  it('under budget', () => {
    const result = budgetUtilisation(1000, [{ amountPaise: 50000 }])
    expect(result.isOverBudget).toBe(false)
    expect(result.percentageUsed).toBe(50)
  })
})
