// src/lib/budget/__tests__/permissions.test.ts
import { canEditBudget } from '../permissions'

describe('canEditBudget', () => {
  it('allows the creator', () => {
    expect(canEditBudget({ uid: 'me', createdBy: 'me' })).toBe(true)
  })

  it('allows an admin', () => {
    expect(canEditBudget({ uid: 'me', createdBy: 'other', adminIds: ['x', 'me'] })).toBe(true)
  })

  it('denies a non-admin, non-creator member', () => {
    expect(canEditBudget({ uid: 'me', createdBy: 'other', adminIds: ['x'] })).toBe(false)
  })

  it('denies when there is no signed-in user', () => {
    expect(canEditBudget({ uid: null, createdBy: 'me', adminIds: ['me'] })).toBe(false)
    expect(canEditBudget({ uid: undefined, createdBy: 'me' })).toBe(false)
  })

  it('handles missing adminIds gracefully', () => {
    expect(canEditBudget({ uid: 'me', createdBy: 'other' })).toBe(false)
    expect(canEditBudget({ uid: 'me', createdBy: 'other', adminIds: null })).toBe(false)
  })
})
