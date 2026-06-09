// src/lib/engine/__tests__/balanceEngine.test.ts
// Unit tests for the balance engine.
// These are pure TS — no React Native, no Firebase.
//
// Run with:   npx jest src/lib/engine/__tests__/balanceEngine.test.ts
//             or:  npx jest --testPathPattern=balanceEngine

import {
  calculateBalances,
  simplifyDebts,
  buildGroupBalanceSummary,
  calculateGroupBalances,
  getMemberBalanceSummary,
  validateBalanceConservationStrict,
  formatBalanceHero,
  type ExpenseInput,
  type RecordedSettlement,
  type ExpenseForBalance,
} from '../balanceEngine'

// ── Helpers ───────────────────────────────────────────────────────────

function mkExpense(
  id: string,
  amount: number,
  paidBy: string,
  splits: Record<string, number>,
  status = 'active',
): ExpenseInput {
  return {
    id,
    groupId: 'g1',
    description: 'Test expense',
    amount,
    currency: 'INR',
    category: 'misc',
    paidBy,
    splitType: 'equal',
    splits,
    date: '2024-01-01',
    createdBy: paidBy,
    createdAt: null as any,
    isSettled: false,
    status,
  } as any
}

// ── calculateBalances ─────────────────────────────────────────────────

describe('calculateBalances', () => {
  it('single payer, equal split between 3', () => {
    // A pays ₹300; each of A, B, C owes ₹100
    const expenses = [mkExpense('e1', 300, 'A', { A: 100, B: 100, C: 100 })]
    const balances = calculateBalances(expenses, ['A', 'B', 'C'])

    const a = balances.find(b => b.uid === 'A')!
    const b = balances.find(b => b.uid === 'B')!
    const c = balances.find(b => b.uid === 'C')!

    expect(a.netPaise).toBe(20_000)  // +₹200 owed to A
    expect(b.netPaise).toBe(-10_000) // -₹100 B owes
    expect(c.netPaise).toBe(-10_000) // -₹100 C owes
    expect(a.isPayer).toBe(true)
    expect(b.isDebtor).toBe(true)
  })

  it('skips deleted expenses', () => {
    const expenses = [
      mkExpense('e1', 300, 'A', { A: 100, B: 100, C: 100 }),
      mkExpense('e2', 600, 'B', { A: 200, B: 200, C: 200 }, 'deleted'),
    ]
    const balances = calculateBalances(expenses, ['A', 'B', 'C'])
    const a = balances.find(b => b.uid === 'A')!
    expect(a.netPaise).toBe(20_000) // Only e1 counted
  })

  it('zero balances when each person pays their own share exactly', () => {
    const expenses = [
      mkExpense('e1', 100, 'A', { A: 100 }),
      mkExpense('e2', 100, 'B', { B: 100 }),
    ]
    const balances = calculateBalances(expenses, ['A', 'B'])
    expect(balances.every(b => b.isSettled)).toBe(true)
  })
})

// ── simplifyDebts ─────────────────────────────────────────────────────

describe('simplifyDebts', () => {
  it('reduces chain A→B→C to single A→C', () => {
    // A owes B ₹100, B owes C ₹100
    // Net: A = -100, B = 0, C = +100
    // Simplified: A pays C ₹100 (B eliminated)
    const expenses = [
      mkExpense('e1', 100, 'B', { A: 100 }),
      mkExpense('e2', 100, 'C', { B: 100 }),
    ]
    const balances = calculateBalances(expenses, ['A', 'B', 'C'])
    const debts = simplifyDebts(balances)

    expect(debts.length).toBe(1)
    expect(debts[0]!.fromUid).toBe('A')
    expect(debts[0]!.toUid).toBe('C')
    expect(debts[0]!.amountPaise).toBe(10_000)
  })

  it('produces N-1 debts for N members in worst case', () => {
    // 4 members: A pays for everyone
    const expenses = [mkExpense('e1', 400, 'A', { A: 100, B: 100, C: 100, D: 100 })]
    const balances = calculateBalances(expenses, ['A', 'B', 'C', 'D'])
    const debts = simplifyDebts(balances)

    expect(debts.length).toBeLessThanOrEqual(3) // ≤ N-1
  })

  it('returns empty array when all balances are zero', () => {
    const expenses: ExpenseInput[] = []
    const balances = calculateBalances(expenses, ['A', 'B'])
    const debts = simplifyDebts(balances)
    expect(debts).toHaveLength(0)
  })
})

// ── buildGroupBalanceSummary ──────────────────────────────────────────

describe('buildGroupBalanceSummary', () => {
  it('correctly applies recorded settlements', () => {
    // A paid ₹300; B owes ₹100, C owes ₹100, A owes ₹100
    const expenses = [mkExpense('e1', 300, 'A', { A: 100, B: 100, C: 100 })]
    const settlements: RecordedSettlement[] = [
      { fromUid: 'B', toUid: 'A', amountPaise: 10_000 },
    ]

    const summary = buildGroupBalanceSummary(expenses, ['A', 'B', 'C'], settlements)

    const b = summary.balances.find(x => x.uid === 'B')!
    // B owed ₹100 (−10,000 paise), then paid ₹100 (added back 10,000)
    expect(b.netPaise).toBe(0)
    expect(b.isSettled).toBe(true)
  })

  it('computes totalExpensesRupees correctly', () => {
    const expenses = [
      mkExpense('e1', 100, 'A', { A: 50, B: 50 }),
      mkExpense('e2', 200, 'B', { A: 100, B: 100 }),
    ]
    const summary = buildGroupBalanceSummary(expenses, ['A', 'B'], [])
    expect(summary.totalExpensesRupees).toBe(300)
  })
})

// ── calculateGroupBalances (Prompt 1.5 API) ───────────────────────────

describe('calculateGroupBalances (Prompt 1.5)', () => {
  const mkFn = (
    paidByUid: string,
    splits: Array<{ uid: string; amountPaise: number }>,
  ): ExpenseForBalance => ({ paidByUid, splitBetween: splits, status: 'active' })

  it('single payer scenario', () => {
    const expenses = [
      mkFn('A', [
        { uid: 'A', amountPaise: 10_000 },
        { uid: 'B', amountPaise: 10_000 },
        { uid: 'C', amountPaise: 10_000 },
      ]),
    ]
    const result = calculateGroupBalances(expenses, ['A', 'B', 'C'])

    // A paid 30k, shared 10k each
    // Net: A = +20k, B = -10k, C = -10k
    expect(result.netBalances['A']).toBe(20_000)
    expect(result.netBalances['B']).toBe(-10_000)
    expect(result.netBalances['C']).toBe(-10_000)
    expect(result.simplifiedDebts.length).toBe(2)
    expect(result.isSettled).toBe(false)
  })

  it('skips non-active expenses', () => {
    const expenses: ExpenseForBalance[] = [
      { paidByUid: 'A', splitBetween: [{ uid: 'B', amountPaise: 10_000 }], status: 'deleted' },
    ]
    const result = calculateGroupBalances(expenses, ['A', 'B'])
    expect(result.netBalances['A']).toBe(0)
    expect(result.netBalances['B']).toBe(0)
    expect(result.isSettled).toBe(true)
  })
})

// ── getMemberBalanceSummary ───────────────────────────────────────────

describe('getMemberBalanceSummary', () => {
  it('correctly identifies creditor status', () => {
    const expenses: ExpenseForBalance[] = [
      { paidByUid: 'A', splitBetween: [{ uid: 'B', amountPaise: 10_000 }], status: 'active' },
    ]
    const group = calculateGroupBalances(expenses, ['A', 'B'])
    const summary = getMemberBalanceSummary('A', group)

    expect(summary.isCreditor).toBe(true)
    expect(summary.isDebtor).toBe(false)
    expect(summary.netPaise).toBe(10_000)
    expect(summary.bilateral[0]!.counterpartUid).toBe('B')
  })
})

// ── validateBalanceConservationStrict ─────────────────────────────────

describe('validateBalanceConservationStrict', () => {
  it('passes when sum is zero', () => {
    const result = validateBalanceConservationStrict(
      { A: 10_000, B: -10_000 },
      2
    )
    expect(result.isValid).toBe(true)
    expect(result.sumPaise).toBe(0)
  })

  it('fails when drift exceeds tolerance', () => {
    const result = validateBalanceConservationStrict(
      { A: 10_000, B: -9_990 },
      2
    )
    expect(result.isValid).toBe(false)
    expect(result.sumPaise).toBe(10)
  })
})

// ── formatBalanceHero ─────────────────────────────────────────────────

describe('formatBalanceHero', () => {
  it('positive paise → +₹ prefix', () => {
    expect(formatBalanceHero(12_500)).toBe('+₹125')
  })

  it('negative paise → -₹ prefix', () => {
    expect(formatBalanceHero(-8_400)).toBe('-₹84')
  })

  it('zero → +₹0', () => {
    expect(formatBalanceHero(0)).toBe('+₹0')
  })
})
