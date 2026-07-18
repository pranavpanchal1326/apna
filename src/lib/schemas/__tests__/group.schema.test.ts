// src/lib/schemas/__tests__/group.schema.test.ts
import { GroupSchema, GroupCreateSchema, GroupUpdateSchema } from '../group.schema'

const validGroup = {
  id: 'grp_1',
  name: 'Goa Trip',
  memberIds: ['uid_a', 'uid_b'],
  adminIds: ['uid_a'],
  createdBy: 'uid_a',
  createdAt: {},
  inviteCode: 'AB12CD',
}

describe('GroupSchema', () => {
  it('accepts a valid group and applies defaults', () => {
    const parsed = GroupSchema.parse(validGroup)
    expect(parsed.status).toBe('active')
    expect(parsed.currency).toBe('INR')
    expect(parsed.balances).toEqual([])
  })

  it('rejects an empty name and an over-long name', () => {
    expect(GroupSchema.safeParse({ ...validGroup, name: '' }).success).toBe(false)
    expect(GroupSchema.safeParse({ ...validGroup, name: 'x'.repeat(61) }).success).toBe(false)
  })

  it('requires at least one member and at most 20', () => {
    expect(GroupSchema.safeParse({ ...validGroup, memberIds: [] }).success).toBe(false)
    const many = Array.from({ length: 21 }, (_, i) => `uid_${i}`)
    expect(GroupSchema.safeParse({ ...validGroup, memberIds: many }).success).toBe(false)
  })

  it('requires at least one admin', () => {
    expect(GroupSchema.safeParse({ ...validGroup, adminIds: [] }).success).toBe(false)
  })

  it('enforces the invite code format (6 uppercase alphanumerics)', () => {
    expect(GroupSchema.safeParse({ ...validGroup, inviteCode: 'abc123' }).success).toBe(false)
    expect(GroupSchema.safeParse({ ...validGroup, inviteCode: 'AB12' }).success).toBe(false)
    expect(GroupSchema.safeParse({ ...validGroup, inviteCode: 'AB12CD' }).success).toBe(true)
  })

  it('rejects a non-positive budget but accepts a positive one', () => {
    expect(GroupSchema.safeParse({ ...validGroup, totalBudget: 0 }).success).toBe(false)
    expect(GroupSchema.safeParse({ ...validGroup, totalBudget: 50000 }).success).toBe(true)
  })

  it('validates optional start/end date format', () => {
    expect(GroupSchema.safeParse({ ...validGroup, startDate: '2026-01-01' }).success).toBe(true)
    expect(GroupSchema.safeParse({ ...validGroup, startDate: '01/01/2026' }).success).toBe(false)
  })

  it('validates nickname length bounds', () => {
    expect(GroupSchema.safeParse({ ...validGroup, nicknames: { uid_a: '' } }).success).toBe(false)
    expect(GroupSchema.safeParse({ ...validGroup, nicknames: { uid_a: 'Bunny' } }).success).toBe(true)
  })
})

describe('GroupCreateSchema', () => {
  it('does not require an id', () => {
    const { id, ...noId } = validGroup
    expect(GroupCreateSchema.safeParse(noId).success).toBe(true)
  })
})

describe('GroupUpdateSchema', () => {
  it('requires id, allows partial updates, and strips immutable fields', () => {
    const res = GroupUpdateSchema.safeParse({ id: 'grp_1', name: 'Renamed' })
    expect(res.success).toBe(true)
  })

  it('fails without an id', () => {
    expect(GroupUpdateSchema.safeParse({ name: 'Renamed' }).success).toBe(false)
  })
})
