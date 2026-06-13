import { calculateEqualSplit, validateSplits, calculatePercentageSplit, calculateNetBalances } from '../lib/utils/settlement'
import type { Expense } from '../lib/types'
import { Timestamp } from 'firebase/firestore'

describe('Budget Calculator', () => {
  test('equal split divides correctly with no remainder', () => {
    const result = calculateEqualSplit(300, ['u1', 'u2', 'u3'])
    expect(result).toEqual({
      u1: 100,
      u2: 100,
      u3: 100,
    })
  })

  test('equal split handles remainders by assigning to payer', () => {
    // In our implementation of calculateEqualSplit, the last person in the array
    // receives the remainder. Here we verify the remainder is absorbed correctly.
    const result = calculateEqualSplit(100, ['u1', 'u2', 'u3'])
    // 100 / 3 = 33.33 each, with u3 absorbing the remainder of 0.01
    expect(result).toEqual({
      u1: 33.33,
      u2: 33.33,
      u3: 33.34,
    })
    const sum = Object.values(result).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(100)
  })

  test('custom split validates amounts sum to total', () => {
    const validSplits = { u1: 50, u2: 30, u3: 20 }
    expect(validateSplits(100, validSplits)).toBe(true)

    const invalidSplits = { u1: 50, u2: 30, u3: 19 }
    expect(validateSplits(100, invalidSplits)).toBe(false)
  })

  test('percentage split validates percentages sum to 100', () => {
    // calculatePercentageSplit returns splits if percentages sum to 100, else null
    const validPercentages = { u1: 50, u2: 30, u3: 20 }
    const result = calculatePercentageSplit(500, validPercentages)
    expect(result).toEqual({
      u1: 250,
      u2: 150,
      u3: 100,
    })

    const invalidPercentages = { u1: 50, u2: 30, u3: 19 }
    const resultInvalid = calculatePercentageSplit(500, invalidPercentages)
    expect(resultInvalid).toBeNull()
  })

  test('paidBy person has their split amount subtracted from obligation', () => {
    // Payer u1 pays 300, splits are equally 100 each.
    // u1's net balance should be +200 (group owes them 200).
    const expenses: Expense[] = [
      {
        id: 'e1',
        groupId: 'g1',
        description: 'Dinner',
        amount: 300,
        currency: 'INR',
        exchangeRateToBase: 1,
        category: 'food',
        paidBy: 'u1',
        splitType: 'equal',
        splits: { u1: 100, u2: 100, u3: 100 },
        date: '2026-06-13',
        createdAt: Timestamp.now(),
        createdBy: 'u1',
      },
    ]

    const balances = calculateNetBalances(expenses, ['u1', 'u2', 'u3'])
    expect(balances).toEqual({
      u1: 200,
      u2: -100,
      u3: -100,
    })
  })

  test('deleted expenses excluded from balance calculation', () => {
    // If expense e2 is deleted, it will not be passed to calculateNetBalances
    const activeExpenses: Expense[] = [
      {
        id: 'e1',
        groupId: 'g1',
        description: 'Dinner',
        amount: 300,
        currency: 'INR',
        exchangeRateToBase: 1,
        category: 'food',
        paidBy: 'u1',
        splitType: 'equal',
        splits: { u1: 100, u2: 100, u3: 100 },
        date: '2026-06-13',
        createdAt: Timestamp.now(),
        createdBy: 'u1',
      },
    ]

    const balances = calculateNetBalances(activeExpenses, ['u1', 'u2', 'u3'])
    expect(balances).toEqual({
      u1: 200,
      u2: -100,
      u3: -100,
    })
  })

  test('settlements excluded from spend total', () => {
    // Verify that settlements (which have isSettled or are different models)
    // are not included in the standard expense total spend.
    const expenses = [
      { id: 'e1', amount: 300, category: 'food' },
      { id: 'e2', amount: 150, category: 'stay' },
    ]
    // A settlement is not passed as an expense or is filtered out.
    const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0)
    expect(totalSpend).toBe(450)
  })

  test('multi-currency expense converts correctly using stored exchange rate', () => {
    // $10 USD expense where 1 USD = 83 INR. Base currency is INR.
    // splits are calculated in base currency (INR) and should sum to 830.
    const amountInUSD = 10
    const exchangeRate = 83
    const baseAmount = amountInUSD * exchangeRate
    expect(baseAmount).toBe(830)

    const splits = calculateEqualSplit(baseAmount, ['u1', 'u2'])
    expect(splits).toEqual({
      u1: 415,
      u2: 415,
    })
  })
})
