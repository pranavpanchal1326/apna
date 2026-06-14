// src/tests/deeplinkParser.test.ts
import { parseDeepLink } from '../navigation/deeplink/parser'

describe('Deep Link Parser Utility', () => {
  test('parses group invite links correctly', () => {
    const res1 = parseDeepLink('apna://join?code=GOA26A')
    expect(res1).not.toBeNull()
    expect(res1!.type).toBe('group_invite')
    expect(res1!.screen).toBe('JoinGroup')
    expect(res1!.params.code).toBe('GOA26A')

    const res2 = parseDeepLink('https://apna.app/join?code=goa26a')
    expect(res2).not.toBeNull()
    expect(res2!.type).toBe('group_invite')
    expect(res2!.screen).toBe('JoinGroup')
    expect(res2!.params.code).toBe('GOA26A') // Normalized to uppercase
  })

  test('handles invalid invite codes by returning unknown', () => {
    const res = parseDeepLink('apna://join?code=INVALID')
    expect(res).not.toBeNull()
    expect(res!.type).toBe('unknown')
  })

  test('parses group direct links correctly', () => {
    const res = parseDeepLink('apna://group/abc123_xyz')
    expect(res).not.toBeNull()
    expect(res!.type).toBe('group_direct')
    expect(res!.screen).toBe('GroupHome')
    expect(res!.params.groupId).toBe('abc123_xyz')
  })

  test('parses expense links correctly', () => {
    const res = parseDeepLink('https://apna.app/group/g1/expense/e1')
    expect(res).not.toBeNull()
    expect(res!.type).toBe('expense')
    expect(res!.screen).toBe('ExpenseDetail')
    expect(res!.params.groupId).toBe('g1')
    expect(res!.params.expenseId).toBe('e1')
  })

  test('parses group settings and members correctly', () => {
    const resSettings = parseDeepLink('apna://group/g1/settings')
    expect(resSettings!.type).toBe('group_settings')
    expect(resSettings!.screen).toBe('GroupSettings')

    const resMembers = parseDeepLink('apna://group/g1/members')
    expect(resMembers!.type).toBe('group_members')
    expect(resMembers!.screen).toBe('GroupMembersManage')
  })

  test('parses memory detail and on-this-day links correctly', () => {
    const resDetail = parseDeepLink('apna://memories/g1/detail/m1')
    expect(resDetail!.type).toBe('memory_detail')
    expect(resDetail!.screen).toBe('MemoryDetail')
    expect(resDetail!.params.groupId).toBe('g1')
    expect(resDetail!.params.memoryId).toBe('m1')

    const resOTD = parseDeepLink('apna://memories/g1/on-this-day')
    expect(resOTD!.type).toBe('on_this_day')
    expect(resOTD!.screen).toBe('OnThisDay')
    expect(resOTD!.params.groupId).toBe('g1')
  })

  test('parses public recap links correctly', () => {
    const res = parseDeepLink('https://apna.app/recap/trip-to-goa-2026')
    expect(res!.type).toBe('recap')
    expect(res!.screen).toBe('PublicRecap')
    expect(res!.params.slug).toBe('trip-to-goa-2026')
  })

  test('parses referral links correctly', () => {
    const res = parseDeepLink('apna://r/MYCODE?c=campaign1&g=group1')
    expect(res!.type).toBe('referral')
    expect(res!.screen).toBe('HomeList')
    expect(res!.params.code).toBe('MYCODE')
    expect(res!.params.campaignId).toBe('campaign1')
    expect(res!.params.groupId).toBe('group1')
  })

  test('returns unknown for unsupported links', () => {
    const res = parseDeepLink('apna://unknown/path')
    expect(res!.type).toBe('unknown')
  })

  test('returns null for empty or invalid input', () => {
    expect(parseDeepLink('')).toBeNull()
    expect(parseDeepLink(null as any)).toBeNull()
  })
})
