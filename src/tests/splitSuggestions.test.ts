// Unit tests for best-split suggestions (Phase 7.3 — pure algorithm).

import {
  paymentStreak,
  totalsPaidByMember,
  suggestNextPayer,
  type PaidExpense,
} from '../lib/engine/splitSuggestions'

const expense = (paidBy: string, amount: number, at: number): PaidExpense => ({
  paidBy,
  amount,
  createdAtMillis: at,
})

describe('paymentStreak', () => {
  it('counts consecutive newest-first payments by the same person', () => {
    const expenses = [
      expense('arjun', 100, 4),
      expense('arjun', 200, 3),
      expense('arjun', 50, 2),
      expense('riya', 80, 1),
    ]
    expect(paymentStreak(expenses)).toEqual({ uid: 'arjun', count: 3 })
  })

  it('handles unsorted input and empty lists', () => {
    expect(paymentStreak([])).toBeNull()
    const shuffled = [expense('a', 1, 1), expense('b', 1, 3), expense('b', 1, 2)]
    expect(paymentStreak(shuffled)).toEqual({ uid: 'b', count: 2 })
  })
})

describe('totalsPaidByMember', () => {
  it('sums per member and zero-fills members without expenses', () => {
    const totals = totalsPaidByMember(
      [expense('a', 100, 1), expense('a', 50, 2), expense('b', 30, 3)],
      ['a', 'b', 'c'],
    )
    expect(totals.get('a')).toBe(150)
    expect(totals.get('b')).toBe(30)
    expect(totals.get('c')).toBe(0)
  })

  it('ignores payments by ex-members', () => {
    const totals = totalsPaidByMember([expense('gone', 500, 1)], ['a'])
    expect(totals.has('gone')).toBe(false)
  })
})

describe('suggestNextPayer', () => {
  it('returns null for solo groups or no history', () => {
    expect(suggestNextPayer([expense('a', 1, 1)], ['a'])).toBeNull()
    expect(suggestNextPayer([], ['a', 'b'])).toBeNull()
  })

  it('frames a 3+ streak with the least-paid member as suggestion', () => {
    const expenses = [
      expense('arjun', 100, 5),
      expense('arjun', 100, 4),
      expense('arjun', 100, 3),
      expense('riya', 40, 2),
    ]
    const suggestion = suggestNextPayer(expenses, ['arjun', 'riya', 'dev'])
    expect(suggestion).toEqual({
      suggestedPayerUid: 'dev', // paid 0
      reason: 'streak',
      streakPayerUid: 'arjun',
      streakCount: 3,
    })
  })

  it('suggests never-paid members without a streak', () => {
    const expenses = [expense('a', 100, 2), expense('b', 90, 1)]
    const suggestion = suggestNextPayer(expenses, ['a', 'b', 'c'])
    expect(suggestion).toEqual({ suggestedPayerUid: 'c', reason: 'never_paid' })
  })

  it('suggests the least-paid member when everyone has paid', () => {
    const expenses = [
      expense('a', 300, 3),
      expense('b', 200, 2),
      expense('c', 100, 1),
    ]
    const suggestion = suggestNextPayer(expenses, ['a', 'b', 'c'])
    expect(suggestion).toEqual({ suggestedPayerUid: 'c', reason: 'least_paid' })
  })
})
