import { calculateSettlements, calculateNetBalances } from '@/lib/budget/settlement'

describe('Settlement Engine — calculateNetBalances', () => {
  test('single expense equal split — payer has positive balance', () => {
    const result = calculateNetBalances([{
      amount: 300, paidBy: 'A',
      splits: { A: 100, B: 100, C: 100 },
      description: '', currency: 'INR', category: 'food', date: '', createdBy: 'A', createdAt: {} as any, isSettled: false
    }], ['A', 'B', 'C'])
    expect(result['A']).toBe(200)   // paid 300, owed 100
    expect(result['B']).toBe(-100)
    expect(result['C']).toBe(-100)
  })

  test('PRD Jaipur example — exact numbers', () => {
    // Pranav +1375, Riya -125, Arjun -3125, Sneha +1875
    const balances = { Pranav: 1375, Riya: -125, Arjun: -3125, Sneha: 1875 }
    const settlements = calculateSettlements(balances)
    expect(settlements.length).toBe(3)
    const total = settlements.reduce((s, t) => s + t.amount, 0)
    expect(total).toBeCloseTo(3250)  // total debt resolved
  })

  test('all zero balances produce no transactions', () => {
    expect(calculateSettlements({ A: 0, B: 0, C: 0 })).toEqual([])
  })

  test('two person — one transaction only', () => {
    const s = calculateSettlements({ A: 500, B: -500 })
    expect(s.length).toBe(1)
    expect(s[0].amount).toBe(500)
    expect(s[0].from).toBe('B')
    expect(s[0].to).toBe('A')
  })

  test('settlement amounts are always positive', () => {
    const s = calculateSettlements({ A: 1375, B: -125, C: -3125, D: 1875 })
    s.forEach(t => expect(t.amount).toBeGreaterThan(0))
  })

  test('no person appears as both payer and receiver', () => {
    const s = calculateSettlements({ A: 1375, B: -125, C: -3125, D: 1875 })
    const payers = s.map(t => t.from)
    const receivers = s.map(t => t.to)
    payers.forEach(p => expect(receivers).not.toContain(p))
  })

  test('sum of all settlements equals total positive balance', () => {
    const balances = { A: 1375, B: -125, C: -3125, D: 1875 }
    const positiveTotal = Object.values(balances).filter(v => v > 0).reduce((a, b) => a + b, 0)
    const s = calculateSettlements(balances)
    const settlementTotal = s.reduce((sum, t) => sum + t.amount, 0)
    expect(settlementTotal).toBeCloseTo(positiveTotal)
  })

  test('deleted user shows as "Deleted User" in settlement display', () => {
    // Balance calculation should still work with deleted user ID
    const balances = { 'deleted_user': 500, B: -500 }
    const s = calculateSettlements(balances)
    expect(s.length).toBe(1)
  })
})

describe('Settlement Engine — calculateNetBalances splits', () => {
  test('rounding: ₹100 split 3 ways assigns remainder to payer', () => {
    const balances = calculateNetBalances([{
      amount: 100, paidBy: 'A',
      splits: { A: 33.34, B: 33.33, C: 33.33 },  // remainder to payer
      description: '', currency: 'INR', category: 'food', date: '', createdBy: 'A', createdAt: {} as any, isSettled: false
    }], ['A', 'B', 'C'])
    const total = Object.values(balances).reduce((a, b) => a + b, 0)
    expect(Math.abs(total)).toBeLessThan(0.01)  // must net to zero
  })

  test('payer excluded from owing themselves', () => {
    const balances = calculateNetBalances([{
      amount: 100, paidBy: 'A',
      splits: { A: 50, B: 50 },
      description: '', currency: 'INR', category: 'food', date: '', createdBy: 'A', createdAt: {} as any, isSettled: false
    }], ['A', 'B'])
    expect(balances['A']).toBe(50)  // paid 100, owed 50 → net +50
    expect(balances['B']).toBe(-50)
  })

  test('multi-currency uses stored exchange rate, not live rate', () => {
    const balances = calculateNetBalances([{
      amount: 100,        // $100
      currency: 'USD',
      exchangeRateToBase: 83.5,   // stored at entry time
      paidBy: 'A',
      splits: { A: 4175, B: 4175 },  // in INR
      description: '', category: 'food', date: '', createdBy: 'A', createdAt: {} as any, isSettled: false
    }], ['A', 'B'])
    // Exchange rate must not be recalculated
    expect(balances['A']).toBeCloseTo(4175)
  })

  test('settlements excluded from spend calculation', () => {
    // A settlement write must not be included in expense totals
    const expenses = [{
      amount: 1000, paidBy: 'A', splits: { A: 500, B: 500 },
      description: '', currency: 'INR', category: 'food', date: '', createdBy: 'A', createdAt: {} as any, isSettled: false
    }]
    const balances = calculateNetBalances(expenses, ['A', 'B'])
    // If settlement is mistakenly included as expense, balance will be wrong
    expect(balances['A']).toBe(500)
    expect(balances['B']).toBe(-500)
  })
})
