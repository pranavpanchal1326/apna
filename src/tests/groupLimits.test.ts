import { canAddMember, canCreateGroup, validateGroupLimits } from '@/lib/groups/limits'

describe('Group Limits', () => {
  test('group at 30 members — cannot add more', () => {
    const members = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`user${i}`, {}]))
    expect(canAddMember(members)).toBe(false)
  })

  test('group at 29 members — can add one more', () => {
    const members = Object.fromEntries(Array.from({ length: 29 }, (_, i) => [`user${i}`, {}]))
    expect(canAddMember(members)).toBe(true)
  })

  test('user with 10 active groups — cannot create more', () => {
    expect(canCreateGroup(10)).toBe(false)
  })

  test('user with 9 active groups — can create one more', () => {
    expect(canCreateGroup(9)).toBe(true)
  })

  test('error message is human-readable', () => {
    const error = validateGroupLimits({ memberCount: 30, userGroupCount: 5 })
    expect(error).not.toBeNull()
    expect(error).toContain('30')
  })
})
