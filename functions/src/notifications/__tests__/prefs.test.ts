// functions/src/notifications/__tests__/prefs.test.ts

import {
  DEFAULT_PREFS,
  resolvePrefs,
  isInSilentHours,
  allowsNotification,
  categoryForType,
} from '../prefs'

describe('resolvePrefs', () => {
  it('returns defaults for absent/garbage prefs', () => {
    expect(resolvePrefs(undefined)).toEqual(DEFAULT_PREFS)
    expect(resolvePrefs(null)).toEqual(DEFAULT_PREFS)
    expect(resolvePrefs('x')).toEqual(DEFAULT_PREFS)
  })

  it('merges partial prefs over defaults', () => {
    const prefs = resolvePrefs({ expenses: false })
    expect(prefs.expenses).toBe(false)
    expect(prefs.memories).toBe(true)
    expect(prefs.silentHours.startHour).toBe(23)
  })

  it('merges partial silentHours', () => {
    const prefs = resolvePrefs({ silentHours: { startHour: 22 } })
    expect(prefs.silentHours).toEqual({ enabled: true, startHour: 22, endHour: 8 })
  })
})

describe('isInSilentHours', () => {
  const wrap = { enabled: true, startHour: 23, endHour: 8 }

  it('handles the midnight-wrapping default window', () => {
    expect(isInSilentHours(wrap, 23)).toBe(true)
    expect(isInSilentHours(wrap, 0)).toBe(true)
    expect(isInSilentHours(wrap, 7)).toBe(true)
    expect(isInSilentHours(wrap, 8)).toBe(false)
    expect(isInSilentHours(wrap, 14)).toBe(false)
    expect(isInSilentHours(wrap, 22)).toBe(false)
  })

  it('handles non-wrapping windows', () => {
    const day = { enabled: true, startHour: 9, endHour: 17 }
    expect(isInSilentHours(day, 9)).toBe(true)
    expect(isInSilentHours(day, 16)).toBe(true)
    expect(isInSilentHours(day, 17)).toBe(false)
    expect(isInSilentHours(day, 8)).toBe(false)
  })

  it('disabled or degenerate windows never match', () => {
    expect(isInSilentHours({ enabled: false, startHour: 23, endHour: 8 }, 2)).toBe(false)
    expect(isInSilentHours({ enabled: true, startHour: 5, endHour: 5 }, 5)).toBe(false)
  })
})

describe('allowsNotification', () => {
  it('SOS always delivers — silent hours and toggles ignored', () => {
    const allOff = resolvePrefs({
      expenses: false, settlements: false, memories: false,
      itinerary: false, groupUpdates: false,
    })
    expect(allowsNotification(allOff, 'sos', 3)).toBe(true)
    expect(allowsNotification(allOff, 'SOS_ALERT', 3)).toBe(true)
  })

  it('blocks during silent hours', () => {
    expect(allowsNotification(DEFAULT_PREFS, 'expense_added', 2)).toBe(false)
    expect(allowsNotification(DEFAULT_PREFS, 'expense_added', 14)).toBe(true)
  })

  it('respects per-category toggles', () => {
    const prefs = resolvePrefs({ expenses: false })
    expect(allowsNotification(prefs, 'expense_added', 14)).toBe(false)
    expect(allowsNotification(prefs, 'expense_updated', 14)).toBe(false)
    expect(allowsNotification(prefs, 'settlement_recorded', 14)).toBe(true)
  })

  it('unknown types default to deliver (outside silent hours)', () => {
    expect(allowsNotification(DEFAULT_PREFS, 'brand_new_type', 14)).toBe(true)
  })
})

describe('categoryForType', () => {
  it('maps all template types', () => {
    expect(categoryForType('expense_added')).toBe('expenses')
    expect(categoryForType('settlement_recorded')).toBe('settlements')
    expect(categoryForType('memory_reaction')).toBe('memories')
    expect(categoryForType('ITINERARY_REMINDER')).toBe('itinerary')
    expect(categoryForType('member_joined')).toBe('groupUpdates')
    expect(categoryForType('nope')).toBeNull()
  })
})
