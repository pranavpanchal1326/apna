import { calculateNetBalances, calculateSettlements } from '../lib/utils/settlement'
import type { Expense } from '../lib/types'

describe('Settlement Engine', () => {
  test('zero balances produce no transactions', () => {
    const netBalances = {
      pranav: 0,
      riya: 0,
      arjun: 0,
    }
    const settlements = calculateSettlements(netBalances)
    expect(settlements).toEqual([])
  })

  test('two-person equal split produces one transaction', () => {
    const netBalances = {
      pranav: 100, // owed ₹100
      riya: -100,  // owes ₹100
    }
    const settlements = calculateSettlements(netBalances)
    expect(settlements).toEqual([
      { from: 'riya', to: 'pranav', amount: 100 },
    ])
  })

  test('four-person Jaipur example from PRD produces exactly 3 transactions', () => {
    // Pranav +1375, Riya -125, Arjun -3125, Sneha +1875
    const netBalances = {
      pranav: 1375,
      riya: -125,
      arjun: -3125,
      sneha: 1875,
    }
    const settlements = calculateSettlements(netBalances)
    
    // Sort settlements to make assertions order-independent
    const sorted = settlements.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to))
    
    expect(sorted).toEqual([
      { from: 'arjun', to: 'pranav', amount: 1250 },
      { from: 'arjun', to: 'sneha', amount: 1875 },
      { from: 'riya', to: 'pranav', amount: 125 },
    ])
  })

  test('creditors and debtors sum to zero', () => {
    const netBalances = {
      p1: 1500,
      p2: 2500,
      p3: -1000,
      p4: -3000,
    }
    const total = Object.values(netBalances).reduce((sum, val) => sum + val, 0)
    expect(total).toBe(0)

    const settlements = calculateSettlements(netBalances)
    const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0)
    expect(totalSettled).toBe(4000)
  })

  test('settlement amounts are always positive', () => {
    const netBalances = {
      a: 150.50,
      b: -50.25,
      c: -100.25,
    }
    const settlements = calculateSettlements(netBalances)
    settlements.forEach((s) => {
      expect(s.amount).toBeGreaterThan(0)
    })
  })

  test('no person pays more than their net balance', () => {
    const netBalances = {
      a: 1000,
      b: -600,
      c: -400,
    }
    const settlements = calculateSettlements(netBalances)
    
    const paidMap: Record<string, number> = {}
    settlements.forEach((s) => {
      paidMap[s.from] = (paidMap[s.from] || 0) + s.amount
    })

    expect(paidMap['b']).toBeLessThanOrEqual(600)
    expect(paidMap['c']).toBeLessThanOrEqual(400)
  })
})
